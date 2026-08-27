import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Save, Link2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  listUsers, updateUserAdmin, saveCategory, deleteCategory, saveLocation, deleteLocation,
  getSettings, updateLineSettings, getLineStatus, sendLineNotification, deleteDemoData,
} from "@/lib/admin.functions";
import { listCategories, listLocations } from "@/lib/work.functions";
import { APP_NAME, ORG_NAME, MODULES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAccess } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: `ตั้งค่าระบบ — ${APP_NAME} ${ORG_NAME}` },
      { name: "description", content: "จัดการผู้ใช้ สิทธิ์การใช้งาน ประเภทงาน สถานที่ และการเชื่อมต่อแจ้งเตือน LINE" },
      { property: "og:title", content: `ตั้งค่าระบบ — ${APP_NAME}` },
      { property: "og:description", content: "จัดการผู้ใช้ สิทธิ์ ประเภทงาน สถานที่ และการแจ้งเตือน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: access } = useAccess();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold lg:text-2xl">ตั้งค่าระบบ</h1>
      {!access?.isAdmin && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          บางส่วนของหน้านี้ใช้ได้เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น
        </p>
      )}
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">ผู้ใช้และสิทธิ์</TabsTrigger>
          <TabsTrigger value="categories">ประเภทงาน</TabsTrigger>
          <TabsTrigger value="locations">สถานที่</TabsTrigger>
          <TabsTrigger value="line">แจ้งเตือน / LINE</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="categories" className="mt-4"><CategoriesTab /></TabsContent>
        <TabsContent value="locations" className="mt-4"><LocationsTab /></TabsContent>
        <TabsContent value="line" className="mt-4"><LineTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ===== ผู้ใช้และสิทธิ์ ===== */

type PermRow = { module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };

function emptyPerms(): PermRow[] {
  return MODULES.map((m) => ({ module: m.key, can_view: false, can_create: false, can_edit: false, can_delete: false }));
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [perms, setPerms] = useState<PermRow[]>(emptyPerms());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setFullName(editing.full_name ?? "");
    setPosition(editing.position ?? "");
    setRole((editing.roles ?? []).includes("admin") ? "admin" : "staff");
    setPerms(
      emptyPerms().map((p) => {
        const found = (editing.permissions ?? []).find((x: any) => x.module === p.module);
        return found
          ? {
              module: p.module,
              can_view: !!found.can_view, can_create: !!found.can_create,
              can_edit: !!found.can_edit, can_delete: !!found.can_delete,
            }
          : p;
      }),
    );
  }, [editing]);

  function togglePerm(module: string, key: keyof Omit<PermRow, "module">, value: boolean) {
    setPerms((prev) => prev.map((p) => (p.module === module ? { ...p, [key]: value } : p)));
  }

  async function save() {
    if (!editing) return;
    if (!fullName.trim()) { toast.error("กรุณาระบุชื่อ-นามสกุล"); return; }
    setSaving(true);
    try {
      await updateUserAdmin({
        data: { userId: editing.id, full_name: fullName.trim(), position: position.trim(), role, permissions: perms },
      });
      toast.success("บันทึกข้อมูลผู้ใช้แล้ว");
      setEditing(null);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-muted-foreground">โหลดรายชื่อผู้ใช้ไม่สำเร็จ (เฉพาะผู้ดูแลระบบ)</p>
        <Button variant="outline" onClick={() => refetch()}>ลองอีกครั้ง</Button>
      </div>
    );
  }
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-2">
      {(users ?? []).map((u: any) => (
        <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {u.full_name || "ไม่ระบุชื่อ"}
              {u.is_owner && (
                <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  เจ้าของระบบ
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {u.position || "ไม่ระบุตำแหน่ง"} · {(u.roles ?? []).includes("admin") ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
            <Pencil className="mr-1 size-4" /> แก้ไขสิทธิ์
          </Button>
        </div>
      ))}
      {(users ?? []).length === 0 && (
        <p className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">ยังไม่มีผู้ใช้</p>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>สิทธิ์ผู้ใช้</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="position">ตำแหน่ง</Label>
                <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>บทบาท</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">ผู้ดูแลระบบ (Admin)</SelectItem>
                  <SelectItem value="staff">เจ้าหน้าที่ (Staff)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "admin" ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                ผู้ดูแลระบบมีสิทธิ์เข้าถึงทุกโมดูลโดยอัตโนมัติ
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">โมดูล</th>
                      <th className="px-2 py-2 font-semibold">ดู</th>
                      <th className="px-2 py-2 font-semibold">เพิ่ม</th>
                      <th className="px-2 py-2 font-semibold">แก้ไข</th>
                      <th className="px-2 py-2 font-semibold">ลบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((m) => {
                      const row = perms.find((p) => p.module === m.key)!;
                      return (
                        <tr key={m.key} className="border-t">
                          <td className="px-3 py-2">{m.label}</td>
                          {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((k) => (
                            <td key={k} className="px-2 py-2 text-center">
                              <Checkbox
                                checked={row[k]}
                                onCheckedChange={(v) => togglePerm(m.key, k, v === true)}
                                aria-label={`${m.label} ${k}`}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>ยกเลิก</Button>
              <Button onClick={save} disabled={saving}>
                <Save className="mr-1 size-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== ประเภทงาน ===== */

function CategoriesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [removing, setRemoving] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  function open(item: any | null) {
    setEditing(item ?? { id: undefined });
    setName(item?.name ?? "");
    setColor(item?.color ?? "#2563eb");
  }

  async function save() {
    if (!name.trim()) { toast.error("กรุณาระบุชื่อประเภทงาน"); return; }
    setBusy(true);
    try {
      await saveCategory({ data: editing?.id ? { id: editing.id, name: name.trim(), color } : { name: name.trim(), color } });
      toast.success("บันทึกประเภทงานแล้ว");
      setEditing(null);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteCategory({ data: { id: removing.id } });
      toast.success("ลบประเภทงานแล้ว");
      setRemoving(null);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => open(null)}><Plus className="mr-1 size-4" /> เพิ่มประเภทงาน</Button>
      </div>
      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).map((c: any) => (
        <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <span className="size-4 rounded-full" style={{ backgroundColor: c.color }} />
          <p className="flex-1 text-sm font-medium">{c.name}</p>
          <Button variant="ghost" size="icon" aria-label="แก้ไข" onClick={() => open(c)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="ลบ" onClick={() => setRemoving(c)}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "แก้ไขประเภทงาน" : "เพิ่มประเภทงาน"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">ชื่อประเภทงาน *</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-color">สีประจำประเภท</Label>
              <Input id="cat-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24 p-1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>ยกเลิก</Button>
              <Button onClick={save} disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึก"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!removing}
        title="ยืนยันการลบประเภทงาน"
        description={`ต้องการลบประเภทงาน “${removing?.name}” ใช่หรือไม่`}
        busy={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
      />
    </div>
  );
}

/* ===== สถานที่ ===== */

function LocationsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["locations"], queryFn: () => listLocations() });
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [removing, setRemoving] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  function open(item: any | null) {
    setEditing(item ?? { id: undefined });
    setName(item?.name ?? "");
    setAddress(item?.address ?? "");
  }

  async function save() {
    if (!name.trim()) { toast.error("กรุณาระบุชื่อสถานที่"); return; }
    setBusy(true);
    try {
      await saveLocation({
        data: editing?.id
          ? { id: editing.id, name: name.trim(), address: address.trim() }
          : { name: name.trim(), address: address.trim() },
      });
      toast.success("บันทึกสถานที่แล้ว");
      setEditing(null);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteLocation({ data: { id: removing.id } });
      toast.success("ลบสถานที่แล้ว");
      setRemoving(null);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => open(null)}><Plus className="mr-1 size-4" /> เพิ่มสถานที่</Button>
      </div>
      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).map((l: any) => (
        <div key={l.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{l.name}</p>
            {l.address && <p className="text-xs text-muted-foreground">{l.address}</p>}
          </div>
          <Button variant="ghost" size="icon" aria-label="แก้ไข" onClick={() => open(l)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="ลบ" onClick={() => setRemoving(l)}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "แก้ไขสถานที่" : "เพิ่มสถานที่"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">ชื่อสถานที่ *</Label>
              <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-addr">ที่อยู่ / รายละเอียด</Label>
              <Input id="loc-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>ยกเลิก</Button>
              <Button onClick={save} disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึก"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!removing}
        title="ยืนยันการลบสถานที่"
        description={`ต้องการลบสถานที่ “${removing?.name}” ใช่หรือไม่`}
        busy={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
      />
    </div>
  );
}

/* ===== LINE / การแจ้งเตือน ===== */

function LineTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings() });
  const { data: status } = useQuery({ queryKey: ["line-status"], queryFn: () => getLineStatus() });
  const [enabled, setEnabled] = useState(false);
  const [onCreate, setOnCreate] = useState(true);
  const [onUpdate, setOnUpdate] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [template, setTemplate] = useState("มีงานใหม่: {title} วันที่ {date}");
  const [busy, setBusy] = useState(false);
  const [testMsg, setTestMsg] = useState("ทดสอบการแจ้งเตือนจากระบบตารางงานฝ่ายประชาสัมพันธ์");

  useEffect(() => {
    const line = (settings as any)?.line;
    if (!line) return;
    setEnabled(!!line.enabled);
    setOnCreate(line.notify_on_create ?? true);
    setOnUpdate(!!line.notify_on_update);
    setTargetId(line.target_id ?? "");
    setTemplate(line.message_template ?? "มีงานใหม่: {title} วันที่ {date}");
  }, [settings]);

  async function save() {
    setBusy(true);
    try {
      await updateLineSettings({
        data: {
          enabled, notify_on_create: onCreate, notify_on_update: onUpdate,
          target_id: targetId.trim(), message_template: template.trim(),
        },
      });
      toast.success("บันทึกการตั้งค่าแล้ว");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const res = await sendLineNotification({ data: { message: testMsg } });
      if (res.sent) toast.success(res.message);
      else toast.warning(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งข้อความไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="size-4" /> สถานะการเชื่อมต่อ LINE</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              status?.configured ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {status?.configured ? "เชื่อมต่อแล้ว" : "ยังไม่ได้ตั้งค่า"}
          </span>
          <p className="text-sm text-muted-foreground">{status?.message ?? "กำลังตรวจสอบ..."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">การตั้งค่าแจ้งเตือน</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="line-enabled">เปิดใช้งานแจ้งเตือนผ่าน LINE</Label>
            <Switch id="line-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="on-create">แจ้งเตือนเมื่อสร้างงานใหม่</Label>
            <Switch id="on-create" checked={onCreate} onCheckedChange={setOnCreate} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="on-update">แจ้งเตือนเมื่อแก้ไขงาน</Label>
            <Switch id="on-update" checked={onUpdate} onCheckedChange={setOnUpdate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target">LINE Target ID (ผู้ใช้/กลุ่ม)</Label>
            <Input id="target" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="Uxxxxxxxx หรือ Cxxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl">รูปแบบข้อความ</Label>
            <Input id="tpl" value={template} onChange={(e) => setTemplate(e.target.value)} />
            <p className="text-xs text-muted-foreground">ใช้ตัวแปร {"{title}"} และ {"{date}"} ได้</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={busy}><Save className="mr-1 size-4" /> บันทึกการตั้งค่า</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ทดสอบส่งข้อความ</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
          <Button variant="outline" onClick={sendTest} disabled={busy || !testMsg.trim()}>
            <Send className="mr-1 size-4" /> ส่งข้อความทดสอบ
          </Button>
          {!status?.configured && (
            <p className="text-xs text-muted-foreground">
              ยังไม่ได้ตั้งค่า credentials ระบบจะไม่ส่งข้อความจริงและจะแจ้งสถานะให้ทราบ
            </p>
          )}
        </CardContent>
      </Card>

      <DemoDataCard />
    </div>
  );
}

function DemoDataCard() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await deleteDemoData({});
      toast.success("ลบข้อมูลตัวอย่างเรียบร้อยแล้ว");
      setOpen(false);
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบข้อมูลตัวอย่างไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">ข้อมูลตัวอย่าง</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          ข้อมูลตัวอย่างถูกทำเครื่องหมายไว้ชัดเจน สามารถลบออกทั้งหมดได้เมื่อเริ่มใช้งานจริง
        </p>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="mr-1 size-4" /> ลบข้อมูลตัวอย่างทั้งหมด
        </Button>
      </CardContent>
      <ConfirmDelete
        open={open}
        title="ยืนยันการลบข้อมูลตัวอย่าง"
        description="ระบบจะลบงานที่ถูกทำเครื่องหมายเป็นข้อมูลตัวอย่างทั้งหมด และไม่สามารถย้อนกลับได้"
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={remove}
      />
    </Card>
  );
}

function ConfirmDelete({
  open, title, description, busy, onCancel, onConfirm,
}: {
  open: boolean; title: string; description: string; busy: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm(); }} disabled={busy}>
            {busy ? "กำลังดำเนินการ..." : "ยืนยัน"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
