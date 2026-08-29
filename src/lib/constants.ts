// ค่าคงที่และป้ายภาษาไทยของระบบ
export const APP_NAME = "ตารางงานประชาสัมพันธ์";
export const ORG_NAME = "เทศบาลนครแม่สอด";

export const PRIORITY_LABELS: Record<string, string> = {
  low: "ต่ำ",
  medium: "ปานกลาง",
  high: "สูง",
  urgent: "ด่วนมาก",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export const PRIORITY_VARIANTS: Record<
  string,
  "secondary" | "outline" | "warning" | "destructive"
> = {
  low: "secondary",
  medium: "outline",
  high: "warning",
  urgent: "destructive",
};

export const STATUS_VARIANTS: Record<string, "secondary" | "info" | "success" | "muted"> = {
  pending: "secondary",
  in_progress: "info",
  completed: "success",
  cancelled: "muted",
};

export const MODULES = [
  { key: "dashboard", label: "แดชบอร์ด" },
  { key: "calendar", label: "ปฏิทินงาน" },
  { key: "tasks", label: "จัดการงาน" },
  { key: "notifications", label: "การแจ้งเตือน" },
  { key: "audit", label: "บันทึกการใช้งาน (Audit Log)" },
  { key: "settings", label: "ตั้งค่าระบบ" },
  { key: "backup", label: "สำรอง/กู้คืนข้อมูล" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const THAI_DAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function formatThaiDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatThaiDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatThaiDate(d)} เวลา ${hh}:${mm} น.`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
