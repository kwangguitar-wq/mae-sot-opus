import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createWorkItem, updateWorkItem, listCategories, listLocations, listProfiles,
} from "@/lib/work.functions";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().trim().min(1, "กรุณาระบุชื่องาน").max(200, "ชื่องานยาวเกินไป"),
  description: z.string().trim().max(5000).default(""),
  category_id: z.string().nullable().default(null),
  work_date: z.string().min(1, "กรุณาระบุวันที่"),
  start_time: z.string().nullable().default(null),
  end_time: z.string().nullable().default(null),
  location_id: z.string().nullable().default(null),
  location_text: z.string().trim().max(300).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  note: z.string().trim().max(2000).default(""),
  assignee_ids: z.array(z.string()).default([]),
});

type FormValues = z.output<typeof formSchema>;
type FormInput = z.input<typeof formSchema>;

export type WorkItemLike = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  location_id: string | null;
  location_text: string | null;
  priority: string;
  status: string;
  note: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  assignees?: { user_id: string }[];
};

export function WorkItemDialog({
  open,
  onOpenChange,
  item,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: WorkItemLike | null;
  defaultDate?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const isEdit = !!item;

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const { data: locations } = useQuery({ queryKey: ["locations"], queryFn: () => listLocations() });
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: () => listProfiles() });

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", description: "", category_id: null, work_date: defaultDate ?? "",
      start_time: null, end_time: null, location_id: null, location_text: "",
      priority: "medium", status: "pending", note: "", assignee_ids: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    setAttachment(null);
    if (item) {
      form.reset({
        title: item.title,
        description: item.description ?? "",
        category_id: item.category_id,
        work_date: item.work_date,
        start_time: item.start_time ? item.start_time.slice(0, 5) : null,
        end_time: item.end_time ? item.end_time.slice(0, 5) : null,
        location_id: item.location_id,
        location_text: item.location_text ?? "",
        priority: item.priority as FormValues["priority"],
        status: item.status as FormValues["status"],
        note: item.note ?? "",
        assignee_ids: (item.assignees ?? []).map((a) => a.user_id),
      });
    } else {
      form.reset({
        title: "", description: "", category_id: null,
        work_date: defaultDate ?? new Date().toISOString().slice(0, 10),
        start_time: null, end_time: null, location_id: null, location_text: "",
        priority: "medium", status: "pending", note: "", assignee_ids: [],
      });
    }
  }, [open, item, defaultDate, form]);

  async function uploadAttachment(): Promise<{ url: string | null; name: string | null }> {
    if (!attachment) return { url: item?.attachment_url ?? null, name: item?.attachment_name ?? null };
    if (attachment.size > 20 * 1024 * 1024) throw new Error("ไฟล์แนบต้องไม่เกิน 20MB");
    const ext = attachment.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("work-attachments").upload(path, attachment);
    if (error) throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ: ${error.message}`);
    return { url: path, name: attachment.name };
  }

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      if (values.start_time && values.end_time && values.end_time < values.start_time) {
        form.setError("end_time", { message: "เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่ม" });
        setSaving(false);
        return;
      }
      const file = await uploadAttachment();
      const payload = {
        ...values,
        category_id: values.category_id || null,
        location_id: values.location_id || null,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        attachment_url: file.url,
        attachment_name: file.name,
      };
      if (isEdit && item) {
        await updateWorkItem({ data: { id: item.id, data: payload } });
        toast.success("บันทึกการแก้ไขงานแล้ว");
      } else {
        await createWorkItem({ data: payload });
        toast.success("สร้างงานใหม่แล้ว");
      }
      queryClient.invalidateQueries();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const assignees = form.watch("assignee_ids");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขงาน" : "สร้างงานใหม่"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">ชื่องาน *</Label>
            <Input id="title" {...form.register("title")} placeholder="เช่น ถ่ายภาพพิธีเปิดงาน" />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">รายละเอียด</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ประเภทงาน</Label>
              <Select
                value={form.watch("category_id") ?? "none"}
                onValueChange={(v) => form.setValue("category_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="เลือกประเภทงาน" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {(categories ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="work_date">วันที่ *</Label>
              <Input id="work_date" type="date" {...form.register("work_date")} />
              {form.formState.errors.work_date && (
                <p className="text-xs text-destructive">{form.formState.errors.work_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_time">เวลาเริ่ม (24 ชม.)</Label>
              <Input id="start_time" type="time" {...form.register("start_time")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">เวลาสิ้นสุด (24 ชม.)</Label>
              <Input id="end_time" type="time" {...form.register("end_time")} />
              {form.formState.errors.end_time && (
                <p className="text-xs text-destructive">{form.formState.errors.end_time.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>สถานที่ (จากรายการ)</Label>
              <Select
                value={form.watch("location_id") ?? "none"}
                onValueChange={(v) => form.setValue("location_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="เลือกสถานที่" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {(locations ?? []).map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location_text">สถานที่เพิ่มเติม</Label>
              <Input id="location_text" {...form.register("location_text")} placeholder="ระบุเองหากไม่มีในรายการ" />
            </div>
            <div className="space-y-1.5">
              <Label>ระดับความสำคัญ</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(v) => form.setValue("priority", v as FormValues["priority"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>สถานะ</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as FormValues["status"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ผู้รับผิดชอบ (เลือกได้หลายคน)</Label>
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
              {(profiles ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">ยังไม่มีผู้ใช้ในระบบ</p>
              )}
              {(profiles ?? []).map((p: any) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                  <Checkbox
                    checked={assignees.includes(p.id)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...assignees, p.id]
                        : assignees.filter((id) => id !== p.id);
                      form.setValue("assignee_ids", next);
                    }}
                  />
                  <span>{p.full_name}</span>
                  {p.position && <span className="text-xs text-muted-foreground">({p.position})</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">หมายเหตุ</Label>
            <Textarea id="note" rows={2} {...form.register("note")} />
          </div>

          <div className="space-y-1.5">
            <Label>ไฟล์แนบ (ไม่เกิน 20MB)</Label>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">
                <Paperclip className="size-4" />
                {attachment ? attachment.name : item?.attachment_name ?? "เลือกไฟล์"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                />
              </label>
              {attachment && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setAttachment(null)} aria-label="ยกเลิกไฟล์">
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "สร้างงาน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
