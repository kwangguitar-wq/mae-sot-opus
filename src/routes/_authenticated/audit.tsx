import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { listAuditLogs } from "@/lib/work.functions";
import { APP_NAME, ORG_NAME, formatThaiDateTime } from "@/lib/constants";
import { downloadCSV } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: `บันทึกการใช้งาน — ${APP_NAME} ${ORG_NAME}` },
      {
        name: "description",
        content: "ประวัติการใช้งานระบบ ผู้ทำรายการ เวลา และข้อมูลสำคัญที่เปลี่ยนแปลง",
      },
      { property: "og:title", content: `บันทึกการใช้งาน — ${APP_NAME}` },
      { property: "og:description", content: "Audit log ของระบบตารางงานประชาสัมพันธ์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

const ALL = "all";
const ENTITY_LABELS: Record<string, string> = {
  work_item: "งาน",
  user: "ผู้ใช้",
  category: "ประเภทงาน",
  location: "สถานที่",
  settings: "การตั้งค่า",
  system: "ระบบ",
  notification: "การแจ้งเตือน",
};
const ACTION_LABELS: Record<string, string> = {
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  backup: "สำรองข้อมูล",
  restore: "กู้คืนข้อมูล",
  delete_demo: "ลบข้อมูลตัวอย่าง",
  send_line: "ส่ง LINE",
};

function AuditPage() {
  const [entity, setEntity] = useState(ALL);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-logs", entity],
    queryFn: () =>
      listAuditLogs({ data: entity === ALL ? { limit: 200 } : { entity, limit: 200 } }),
  });

  function exportCSV() {
    downloadCSV(
      `บันทึกการใช้งาน-${new Date().toISOString().slice(0, 10)}.csv`,
      ["เวลา", "ผู้ทำรายการ", "การกระทำ", "หัวข้อ", "รายละเอียด"],
      (data ?? []).map((l: any) => [
        formatThaiDateTime(l.created_at),
        l.user_name ?? "",
        ACTION_LABELS[l.action] ?? l.action,
        ENTITY_LABELS[l.entity] ?? l.entity,
        JSON.stringify(l.details ?? {}),
      ]),
    );
    toast.success("ส่งออกไฟล์ CSV แล้ว");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold lg:text-2xl">บันทึกการใช้งาน</h1>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">หัวข้อ</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทั้งหมด</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={(data ?? []).length === 0}
          >
            <FileDown className="mr-1 size-4" /> ส่งออก CSV
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">
            โหลดบันทึกการใช้งานไม่สำเร็จ (เฉพาะผู้มีสิทธิ์เท่านั้น)
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            ลองอีกครั้ง
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
          ยังไม่มีบันทึกการใช้งาน
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">เวลา</th>
                <th className="px-3 py-2 text-left font-semibold">ผู้ทำรายการ</th>
                <th className="px-3 py-2 text-left font-semibold">การกระทำ</th>
                <th className="px-3 py-2 text-left font-semibold">หัวข้อ</th>
                <th className="px-3 py-2 text-left font-semibold">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((l: any) => (
                <tr key={l.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatThaiDateTime(l.created_at)}
                  </td>
                  <td className="px-3 py-2">{l.user_name || "—"}</td>
                  <td className="px-3 py-2">{ACTION_LABELS[l.action] ?? l.action}</td>
                  <td className="px-3 py-2">{ENTITY_LABELS[l.entity] ?? l.entity}</td>
                  <td className="max-w-md px-3 py-2 text-xs break-words text-muted-foreground">
                    {JSON.stringify(l.details ?? {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
