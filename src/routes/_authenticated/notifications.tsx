import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/work.functions";
import { APP_NAME, ORG_NAME, formatThaiDateTime } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: `การแจ้งเตือน — ${APP_NAME} ${ORG_NAME}` },
      {
        name: "description",
        content: "การแจ้งเตือนงานที่ได้รับมอบหมายและการเปลี่ยนแปลงงานภายในระบบ",
      },
      { property: "og:title", content: `การแจ้งเตือน — ${APP_NAME}` },
      { property: "og:description", content: "การแจ้งเตือนภายในระบบตารางงานประชาสัมพันธ์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listMyNotifications(),
  });

  const unreadCount = (data ?? []).filter((n: any) => !n.is_read).length;

  async function markAll() {
    try {
      await markAllNotificationsRead({});
      toast.success("ทำเครื่องหมายอ่านทั้งหมดแล้ว");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  }

  async function markOne(id: string) {
    try {
      await markNotificationRead({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold lg:text-2xl">การแจ้งเตือน</h1>
        <Button variant="outline" size="sm" onClick={markAll} disabled={unreadCount === 0}>
          <CheckCheck className="mr-1 size-4" /> อ่านทั้งหมด ({unreadCount})
        </Button>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">โหลดการแจ้งเตือนไม่สำเร็จ</p>
          <Button variant="outline" onClick={() => refetch()}>
            ลองอีกครั้ง
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card py-16 text-center">
          <BellRing className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((n: any) => (
            <div
              key={n.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-card p-4",
                !n.is_read && "border-primary/40 bg-accent/40",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatThaiDateTime(n.created_at)}
                </p>
              </div>
              {!n.is_read && (
                <Button variant="ghost" size="sm" onClick={() => markOne(n.id)}>
                  ทำเครื่องหมายว่าอ่าน
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
