import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileDown, Printer, Pencil, Trash2, Eye } from "lucide-react";
import {
  listWorkItems, listCategories, listLocations, listProfiles, deleteWorkItem, getWorkItem,
} from "@/lib/work.functions";
import {
  APP_NAME, ORG_NAME, PRIORITY_LABELS, STATUS_LABELS, formatThaiDate,
} from "@/lib/constants";
import { downloadCSV } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PriorityBadge, StatusBadge, CategoryDot } from "@/components/badges";
import { WorkItemDialog } from "@/components/WorkItemDialog";
import { WorkItemDetail } from "@/components/WorkItemDetail";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  validateSearch: (search: Record<string, unknown>): { create?: boolean; task?: string } => {
    const out: { create?: boolean; task?: string } = {};
    if (search["create"] === true || search["create"] === "true") out.create = true;
    if (typeof search["task"] === "string" && search["task"]) out.task = search["task"];
    return out;
  },
  head: () => ({
    meta: [
      { title: `จัดการงาน — ${APP_NAME} ${ORG_NAME}` },
      { name: "description", content: "ค้นหา กรอง เพิ่ม แก้ไข และลบงานประชาสัมพันธ์ พร้อมส่งออก Excel/CSV และพิมพ์" },
      { property: "og:title", content: `จัดการงาน — ${APP_NAME}` },
      { property: "og:description", content: "ค้นหาและจัดการงานประชาสัมพันธ์ทั้งหมด" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

const ALL = "all";

function TasksPage() {
  const { create, task } = Route.useSearch();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [assigneeId, setAssigneeId] = useState(ALL);
  const [locationId, setLocationId] = useState(ALL);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (create) setCreateOpen(true);
  }, [create]);

  // เปิดรายละเอียดงานอัตโนมัติเมื่อเข้ามาจากลิงก์ใน LINE (?task=<id>)
  const { data: linkedTask, error: linkedError } = useQuery({
    queryKey: ["work-item", task],
    queryFn: () => getWorkItem({ data: { id: task! } }),
    enabled: !!task,
  });
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[deeplink]", task, linkedTask, linkedError);
    if (linkedTask) setDetail(linkedTask);
  }, [linkedTask, linkedError, task]);


  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
      categoryId: categoryId === ALL ? undefined : categoryId,
      status: status === ALL ? undefined : status,
      priority: priority === ALL ? undefined : priority,
      assigneeId: assigneeId === ALL ? undefined : assigneeId,
      locationId: locationId === ALL ? undefined : locationId,
    }),
    [q, from, to, categoryId, status, priority, assigneeId, locationId],
  );

  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ["work-items", "list", filters],
    queryFn: () => listWorkItems({ data: filters }),
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const { data: locations } = useQuery({ queryKey: ["locations"], queryFn: () => listLocations() });
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: () => listProfiles() });

  function resetFilters() {
    setQ(""); setFrom(""); setTo("");
    setCategoryId(ALL); setStatus(ALL); setPriority(ALL); setAssigneeId(ALL); setLocationId(ALL);
  }

  function exportCSV() {
    const rows = (items ?? []).map((w: any) => [
      formatThaiDate(w.work_date),
      w.start_time?.slice(0, 5) ?? "",
      w.end_time?.slice(0, 5) ?? "",
      w.title,
      w.category?.name ?? "",
      w.location?.name ?? w.location_text ?? "",
      (w.assignees ?? []).map((a: any) => a.profile?.full_name).filter(Boolean).join(", "),
      PRIORITY_LABELS[w.priority] ?? w.priority,
      STATUS_LABELS[w.status] ?? w.status,
      w.note ?? "",
    ]);
    downloadCSV(
      `ตารางงาน-${new Date().toISOString().slice(0, 10)}.csv`,
      ["วันที่", "เริ่ม", "สิ้นสุด", "ชื่องาน", "ประเภท", "สถานที่", "ผู้รับผิดชอบ", "ความสำคัญ", "สถานะ", "หมายเหตุ"],
      rows,
    );
    toast.success("ส่งออกไฟล์ CSV แล้ว");
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteWorkItem({ data: { id: deleting.id } });
      toast.success("ลบงานเรียบร้อยแล้ว");
      setDeleting(null);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบงานไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-xl font-bold lg:text-2xl">จัดการงาน</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={(items ?? []).length === 0}>
            <FileDown className="mr-1 size-4" /> ส่งออก CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 size-4" /> พิมพ์ A4
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 size-4" /> สร้างงาน
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="q">ค้นหา</Label>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input id="q" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่องาน รายละเอียด หรือสถานที่" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from">ตั้งแต่วันที่</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">ถึงวันที่</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ประเภทงาน</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทุกประเภท</SelectItem>
                {(categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>สถานะ</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทุกสถานะ</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ความสำคัญ</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทุกระดับ</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ผู้รับผิดชอบ</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทุกคน</SelectItem>
                {(profiles ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>สถานที่</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทุกสถานที่</SelectItem>
                {(locations ?? []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>ล้างตัวกรอง</Button>
          </div>
        </CardContent>
      </Card>

      <div className="hidden print:block">
        <h2 className="text-lg font-bold">{APP_NAME} {ORG_NAME}</h2>
        <p className="text-sm">พิมพ์เมื่อ {formatThaiDate(new Date())}</p>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">โหลดรายการงานไม่สำเร็จ</p>
          <Button variant="outline" onClick={() => refetch()}>ลองอีกครั้ง</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
          ไม่พบงานตามเงื่อนไขที่เลือก
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground print:hidden">พบ {(items ?? []).length} รายการ</p>
          {(items ?? []).map((w: any) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <CategoryDot color={w.category?.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{w.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatThaiDate(w.work_date)} · {w.start_time ? `${w.start_time.slice(0, 5)} น.` : "ทั้งวัน"} · {w.category?.name ?? "ไม่ระบุประเภท"}
                  {(w.location?.name || w.location_text) && ` · ${w.location?.name ?? w.location_text}`}
                </p>
                {(w.assignees ?? []).length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    ผู้รับผิดชอบ: {(w.assignees ?? []).map((a: any) => a.profile?.full_name).filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={w.priority} />
                <StatusBadge status={w.status} />
              </div>
              <div className="flex gap-1 print:hidden">
                <Button variant="ghost" size="icon" aria-label="ดูรายละเอียด" onClick={() => setDetail(w)}>
                  <Eye className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="แก้ไข" onClick={() => setEditing(w)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="ลบ" onClick={() => setDeleting(w)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WorkItemDetail
        item={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onEdit={(it) => { setDetail(null); setEditing(it); }}
      />
      <WorkItemDialog
        open={createOpen || !!editing}
        item={editing}
        onOpenChange={(o) => {
          if (!o) { setCreateOpen(false); setEditing(null); queryClient.invalidateQueries(); }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบงาน</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบงาน “{deleting?.title}” ใช่หรือไม่ การลบไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={busy}>
              {busy ? "กำลังลบ..." : "ลบงาน"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
