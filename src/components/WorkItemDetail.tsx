import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryDot, PriorityBadge, StatusBadge } from "@/components/badges";
import { formatThaiDate, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, Users, StickyNote, Paperclip, User } from "lucide-react";

export function WorkItemDetail({
  item,
  open,
  onOpenChange,
  onEdit,
}: {
  item: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: any) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    setFileUrl(null);
    if (open && item?.attachment_url) {
      supabase.storage
        .from("work-attachments")
        .createSignedUrl(item.attachment_url, 3600)
        .then(({ data }) => setFileUrl(data?.signedUrl ?? null));
    }
  }, [open, item]);

  if (!item) return null;
  const assignees = (item.assignees ?? []).map((a: any) => a.profile?.full_name).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6 text-base leading-snug">
            <CategoryDot color={item.category?.color} />
            {item.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
            {item.is_demo && (
              <span className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                ข้อมูลตัวอย่าง
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatThaiDate(item.work_date)}</p>
                {(item.start_time || item.end_time) && (
                  <p className="text-muted-foreground">
                    {item.start_time?.slice(0, 5) ?? "--:--"} - {item.end_time?.slice(0, 5) ?? "--:--"} น.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <p>{item.location?.name ?? item.location_text ?? "ไม่ระบุสถานที่"}</p>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 size-4 text-muted-foreground" />
              <p>{assignees.length > 0 ? assignees.join(", ") : "ยังไม่ได้มอบหมาย"}</p>
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 size-4 text-muted-foreground" />
              <p className="text-muted-foreground">สร้างโดย {item.creator?.full_name ?? "—"}</p>
            </div>
          </div>

          {item.description && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-sm font-semibold">รายละเอียด</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
              </div>
            </>
          )}

          {item.note && (
            <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="whitespace-pre-wrap">{item.note}</p>
            </div>
          )}

          {item.attachment_name && (
            <div>
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
                >
                  <Paperclip className="size-4" /> {item.attachment_name}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="size-4" /> {item.attachment_name}
                </span>
              )}
            </div>
          )}

          {onEdit && (
            <div className="flex justify-end pt-2">
              <Button onClick={() => onEdit(item)}>แก้ไขงานนี้</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ใช้แสดงป้ายสถานะ/ความสำคัญพร้อม label ไทยในจุดอื่น
export { PRIORITY_LABELS, STATUS_LABELS };
