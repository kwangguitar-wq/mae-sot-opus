import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SupabaseCtx = { supabase: any; userId: string };

async function requireAdmin(ctx: SupabaseCtx) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น");
}

async function writeAudit(
  ctx: SupabaseCtx,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown>,
) {
  const { data: profile } = await ctx.supabase
    .from("profiles").select("full_name").eq("id", ctx.userId).maybeSingle();
  await ctx.supabase.from("audit_logs").insert({
    user_id: ctx.userId,
    user_name: profile?.full_name ?? "",
    action, entity, entity_id: entityId, details,
  });
}

// ===== ผู้ใช้และสิทธิ์ =====

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await requireAdmin(ctx);
    const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
      ctx.supabase.from("profiles").select("*").order("full_name"),
      ctx.supabase.from("user_roles").select("user_id, role"),
      ctx.supabase.from("user_permissions").select("*"),
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owners = await Promise.all(
      (profiles ?? []).map(async (p: any) => {
        const { data } = await supabaseAdmin.rpc("is_protected_owner", { _user_id: p.id });
        return data === true ? p.id : null;
      }),
    );
    const ownerIds = new Set(owners.filter(Boolean));
    return (profiles ?? []).map((p: any) => ({
      ...p,
      is_owner: ownerIds.has(p.id),
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      permissions: (perms ?? []).filter((x: any) => x.user_id === p.id),
    }));
  });

export const updateUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      full_name: z.string().trim().min(1).max(100),
      position: z.string().trim().max(100).default(""),
      role: z.enum(["admin", "staff"]),
      permissions: z.array(
        z.object({
          module: z.string(),
          can_view: z.boolean(),
          can_create: z.boolean(),
          can_edit: z.boolean(),
          can_delete: z.boolean(),
        }),
      ),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await requireAdmin(ctx);

    // บัญชีเจ้าของระบบต้องเป็นผู้ดูแลระบบเสมอ — ป้องกันการลดสิทธิ์
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isOwner } = await supabaseAdmin.rpc("is_protected_owner", { _user_id: data.userId });
    if (isOwner && data.role !== "admin") {
      throw new Error("บัญชีผู้ดูแลระบบหลัก (Owner) ไม่สามารถลดสิทธิ์ได้");
    }

    const { error: pErr } = await ctx.supabase
      .from("profiles")
      .update({ full_name: data.full_name, position: data.position })
      .eq("id", data.userId);
    if (pErr) throw new Error(pErr.message);

    await ctx.supabase.from("user_roles").delete().eq("user_id", data.userId);
    const { error: rErr } = await ctx.supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (rErr) throw new Error(rErr.message);

    await ctx.supabase.from("user_permissions").delete().eq("user_id", data.userId);
    if (data.role !== "admin" && data.permissions.length > 0) {
      const { error: permErr } = await ctx.supabase
        .from("user_permissions")
        .insert(data.permissions.map((p) => ({ ...p, user_id: data.userId })));
      if (permErr) throw new Error(permErr.message);
    }

    await writeAudit(ctx, "update", "user", data.userId, {
      full_name: data.full_name, role: data.role, permissions: data.permissions,
    });
    return { ok: true };
  });

// ===== ประเภทงาน / สถานที่ =====

const nameSchema = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อ").max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  address: z.string().trim().max(300).optional(),
});

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid().optional(), name: nameSchema.shape.name, color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: can } = await ctx.supabase.rpc("has_permission", { _user_id: ctx.userId, _module: "settings", _action: "edit" });
    if (!can) throw new Error("คุณไม่มีสิทธิ์จัดการประเภทงาน");
    const payload = { name: data.name, color: data.color };
    const { error } = data.id
      ? await ctx.supabase.from("categories").update(payload).eq("id", data.id)
      : await ctx.supabase.from("categories").insert(payload);
    if (error) throw new Error(error.message);
    await writeAudit(ctx, data.id ? "update" : "create", "category", data.id ?? null, payload);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: can } = await ctx.supabase.rpc("has_permission", { _user_id: ctx.userId, _module: "settings", _action: "delete" });
    if (!can) throw new Error("คุณไม่มีสิทธิ์ลบประเภทงาน");
    const { error } = await ctx.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(ctx, "delete", "category", data.id, {});
    return { ok: true };
  });

export const saveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid().optional(), name: nameSchema.shape.name, address: z.string().trim().max(300).default("") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: can } = await ctx.supabase.rpc("has_permission", { _user_id: ctx.userId, _module: "settings", _action: "edit" });
    if (!can) throw new Error("คุณไม่มีสิทธิ์จัดการสถานที่");
    const payload = { name: data.name, address: data.address };
    const { error } = data.id
      ? await ctx.supabase.from("locations").update(payload).eq("id", data.id)
      : await ctx.supabase.from("locations").insert(payload);
    if (error) throw new Error(error.message);
    await writeAudit(ctx, data.id ? "update" : "create", "location", data.id ?? null, payload);
    return { ok: true };
  });

export const deleteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: can } = await ctx.supabase.rpc("has_permission", { _user_id: ctx.userId, _module: "settings", _action: "delete" });
    if (!can) throw new Error("คุณไม่มีสิทธิ์ลบสถานที่");
    const { error } = await ctx.supabase.from("locations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(ctx, "delete", "location", data.id, {});
    return { ok: true };
  });

// ===== การตั้งค่า / LINE =====

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data, error } = await ctx.supabase.from("settings").select("*");
    if (error) throw new Error(error.message);
    const map: Record<string, any> = {};
    for (const row of data ?? []) map[(row as any).key] = (row as any).value;
    return map;
  });

export const updateLineSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      enabled: z.boolean(),
      notify_on_create: z.boolean(),
      notify_on_update: z.boolean(),
      target_id: z.string().trim().max(100).default(""),
      message_template: z.string().trim().max(500).default("มีงานใหม่: {title} วันที่ {date}"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await requireAdmin(ctx);
    const { error } = await ctx.supabase.from("settings").upsert({
      key: "line",
      value: data,
      updated_by: ctx.userId,
    });
    if (error) throw new Error(error.message);
    await writeAudit(ctx, "update", "settings", "line", { enabled: data.enabled });
    return { ok: true };
  });

// ตรวจสถานะการเชื่อมต่อ LINE — ซื่อสัตย์: รายงาน "ยังไม่ได้ตั้งค่า" เมื่อไม่มี credentials
export const getLineStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const token = process.env["LINE_CHANNEL_ACCESS_TOKEN"];
    if (!token) {
      return {
        configured: false,
        message: "ยังไม่ได้ตั้งค่า LINE Channel Access Token — เพิ่มค่าใน Project Settings → Secrets ด้วยชื่อ LINE_CHANNEL_ACCESS_TOKEN เพื่อเปิดใช้งานการส่งแจ้งเตือนผ่าน LINE",
      };
    }
    try {
      const res = await fetch("https://api.line.me/v2/bot/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { configured: false, message: "พบ Token แต่ตรวจสอบกับ LINE ไม่สำเร็จ — กรุณาตรวจสอบความถูกต้อง" };
      const info = await res.json();
      return { configured: true, message: `เชื่อมต่อ LINE Official Account แล้ว: ${info.displayName ?? "พร้อมใช้งาน"}` };
    } catch {
      return { configured: false, message: "ไม่สามารถเชื่อมต่อบริการ LINE ได้ในขณะนี้" };
    }
  });

export const sendLineNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ message: z.string().trim().min(1).max(900) }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await requireAdmin(ctx);
    const { data: setting } = await ctx.supabase.from("settings").select("value").eq("key", "line").maybeSingle();
    const targetId = (setting?.value as any)?.target_id ?? "";
    const { pushLineMessage } = await import("./line.server");
    const result = await pushLineMessage(targetId, data.message, `test-${ctx.userId}-${Date.now()}`);
    if (result.sent) await writeAudit(ctx, "send_line", "notification", null, { message: data.message });
    return { sent: result.sent, message: result.message };
  });

// ===== ข้อมูลตัวอย่าง =====

export const deleteDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await requireAdmin(ctx);
    const { error } = await ctx.supabase.from("work_items").delete().eq("is_demo", true);
    if (error) throw new Error(error.message);
    await writeAudit(ctx, "delete_demo", "work_item", null, {});
    return { ok: true };
  });

// ===== สำรอง / กู้คืนข้อมูล (Admin) =====

const BACKUP_TABLES = [
  "profiles", "user_roles", "user_permissions", "categories", "locations",
  "work_items", "work_assignees", "notifications", "settings",
] as const;

export const backupData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await requireAdmin(ctx);
    const out: Record<string, any[]> = {};
    for (const table of BACKUP_TABLES) {
      const { data, error } = await ctx.supabase.from(table).select("*");
      if (error) throw new Error(`สำรองตาราง ${table} ไม่สำเร็จ: ${error.message}`);
      out[table] = data ?? [];
    }
    await writeAudit(ctx, "backup", "system", null, { tables: BACKUP_TABLES.length });
    return {
      meta: { app: "mae-sot-pr-schedule", version: 1, created_at: new Date().toISOString() },
      data: out,
    };
  });

export const restoreData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      backup: z.object({
        meta: z.object({ app: z.string(), version: z.number(), created_at: z.string().optional() }),
        data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
      }),
      confirm: z.literal("RESTORE"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    await requireAdmin(ctx);
    if (data.backup.meta.app !== "mae-sot-pr-schedule") {
      throw new Error("ไฟล์สำรองไม่ตรงกับระบบนี้");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ลบตามลำดับย้อน dependency แล้วค่อย insert กลับ
    // คอลัมน์คีย์จริงของแต่ละตาราง (settings ใช้ key, work_assignees เป็น composite key)
    const PK: Record<string, string> = {
      profiles: "id", user_roles: "id", user_permissions: "id", categories: "id",
      locations: "id", work_items: "id", work_assignees: "work_item_id",
      notifications: "id", settings: "key",
    };
    const CONFLICT: Record<string, string> = {
      work_assignees: "work_item_id,user_id", settings: "key",
    };
    const deleteOrder = [...BACKUP_TABLES].reverse().filter((t) => t !== "profiles");
    for (const table of deleteOrder) {
      const col = PK[table] ?? "id";
      const { error } = await supabaseAdmin.from(table).delete().not(col, "is", null);
      if (error) throw new Error(`ล้างตาราง ${table} ไม่สำเร็จ: ${error.message}`);
    }
    for (const table of BACKUP_TABLES) {
      const rows = data.backup.data[table] ?? [];
      if (rows.length === 0) continue;
      const conflict = CONFLICT[table];
      const { error } = conflict
        ? await supabaseAdmin.from(table).upsert(rows as any[], { onConflict: conflict })
        : await supabaseAdmin.from(table).upsert(rows as any[]);
      if (error) throw new Error(`กู้คืนตาราง ${table} ไม่สำเร็จ: ${error.message}`);
    }

    await writeAudit(ctx, "restore", "system", null, { at: data.backup.meta.created_at });
    return { ok: true };
  });
