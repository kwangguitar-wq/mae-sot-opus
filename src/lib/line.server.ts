// LINE Messaging API integration (server-only).
// ห้าม import ไฟล์นี้จากฝั่ง client — โทเค็นอ่านจาก process.env ภายในฟังก์ชันเท่านั้น
// และจะไม่ถูก log หรือส่งกลับไปยัง client ไม่ว่ากรณีใด

export type LineSendResult = {
  sent: boolean;
  status?: number;
  reason?: "no_token" | "no_target" | "disabled" | "api_error" | "network_error";
  message: string;
};

type LineSettings = {
  enabled?: boolean;
  notify_on_create?: boolean;
  notify_on_update?: boolean;
  target_id?: string;
  message_template?: string;
  app_url?: string;
};

/** ลิงก์เปิดงานโดยตรง — ใช้ค่า app_url จากหน้าตั้งค่า มิฉะนั้นใช้โดเมนที่เผยแพร่ */
export function buildWorkLink(workId: string, appUrl?: string): string {
  const base = (
    appUrl ||
    process.env["APP_BASE_URL"] ||
    "https://mee-sot-opus.lovable.app"
  ).replace(/\/+$/, "");
  return `${base}/tasks?task=${workId}`;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** LINE ต้องการ retry key รูปแบบ UUID — แปลง seed คงที่ให้เป็น UUID เพื่อกันส่งซ้ำ */
async function seedToUuid(seed: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  const h = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** ส่งข้อความ push พร้อม retry สำหรับข้อผิดพลาดชั่วคราว และกันการส่งซ้ำด้วย X-Line-Retry-Key */
export async function pushLineMessage(
  targetId: string,
  text: string,
  retryKey: string,
): Promise<LineSendResult> {
  const token = process.env["LINE_CHANNEL_ACCESS_TOKEN"];
  if (!token) {
    return {
      sent: false,
      reason: "no_token",
      message:
        "ยังไม่ได้ตั้งค่า LINE Channel Access Token — เพิ่ม secret ชื่อ LINE_CHANNEL_ACCESS_TOKEN ใน Project Settings → Secrets",
    };
  }
  if (!targetId) {
    return {
      sent: false,
      reason: "no_target",
      message: "ยังไม่ได้ระบุ LINE Target ID ในหน้าตั้งค่า",
    };
  }

  const uuidKey = await seedToUuid(retryKey);
  let lastStatus: number | undefined;
  let lastDetail = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          // คีย์เดิม = LINE จะไม่ส่งข้อความซ้ำแม้เรียกใหม่
          "X-Line-Retry-Key": uuidKey,
        },
        body: JSON.stringify({
          to: targetId,
          messages: [{ type: "text", text: text.slice(0, 4900) }],
        }),
      });
      lastStatus = res.status;
      if (res.ok)
        return { sent: true, status: res.status, message: "ส่งข้อความ LINE เรียบร้อยแล้ว" };
      lastDetail = ((await res.json().catch(() => ({}))) as { message?: string }).message ?? "";
      if (!RETRYABLE.has(res.status)) break;
    } catch {
      lastDetail = "เชื่อมต่อบริการ LINE ไม่สำเร็จ";
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }

  return {
    sent: false,
    ...(lastStatus === undefined ? {} : { status: lastStatus }),
    reason: lastStatus ? "api_error" : "network_error",
    message: lastStatus
      ? `LINE ตอบกลับด้วยข้อผิดพลาด (${lastStatus})${lastDetail ? `: ${lastDetail}` : ""}`
      : "เชื่อมต่อบริการ LINE ไม่สำเร็จ",
  };
}

/** แจ้งเตือนอัตโนมัติเมื่อสร้าง/แก้ไขงาน — ไม่ throw เพื่อไม่ให้กระทบการบันทึกงาน */
export async function notifyLineWorkEvent(
  supabase: { from: (t: string) => any },
  event: "create" | "update",
  work: {
    id: string;
    title: string;
    work_date: string;
    start_time?: string | null;
    updated_at?: string | null;
  },
): Promise<LineSendResult> {
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "line")
      .maybeSingle();
    const cfg = (data?.value ?? {}) as LineSettings;
    if (!cfg.enabled)
      return { sent: false, reason: "disabled", message: "ปิดการแจ้งเตือน LINE อยู่" };
    if (event === "create" && cfg.notify_on_create === false)
      return { sent: false, reason: "disabled", message: "ปิดการแจ้งเตือนเมื่อสร้างงาน" };
    if (event === "update" && cfg.notify_on_update === false)
      return { sent: false, reason: "disabled", message: "ปิดการแจ้งเตือนเมื่อแก้ไขงาน" };

    const template = cfg.message_template || "มีงานใหม่: {title} วันที่ {date}";
    const link = buildWorkLink(work.id, cfg.app_url);
    let text = template
      .replaceAll("{title}", work.title)
      .replaceAll("{date}", work.work_date)
      .replaceAll("{time}", work.start_time ?? "-")
      .replaceAll("{link}", link);
    // ถ้าเทมเพลตไม่ได้ใส่ {link} ไว้ ให้แนบลิงก์ต่อท้ายอัตโนมัติ
    if (!template.includes("{link}")) text += `\n🔗 เปิดดูงาน: ${link}`;
    const prefix = event === "update" ? "อัปเดตงาน — " : "";
    return await pushLineMessage(
      cfg.target_id ?? "",
      prefix + text,
      `${event}-${work.id}-${work.work_date}-${work.updated_at ?? ""}`,
    );
  } catch {
    return {
      sent: false,
      reason: "network_error",
      message: "ไม่สามารถส่งแจ้งเตือน LINE ได้ในขณะนี้",
    };
  }
}
