import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Bell,
  ScrollText,
  Settings,
  DatabaseBackup,
  LogOut,
  Menu,
  Building2,
  Plus,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess, listMyNotifications } from "@/lib/work.functions";
import { APP_NAME, ORG_NAME, type ModuleKey } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatThaiDateTime } from "@/lib/constants";
import { toast } from "sonner";

type Access = {
  isAdmin: boolean;
  permissions: { module: string; can_view: boolean }[];
  profile: { full_name: string; position: string } | null;
  userId: string;
};

export function useAccess() {
  return useQuery({
    queryKey: ["my-access"],
    queryFn: () => getMyAccess() as Promise<Access>,
    staleTime: 30_000,
  });
}

export function canView(access: Access | undefined, module: ModuleKey) {
  if (!access) return false;
  if (access.isAdmin) return true;
  return access.permissions.some((p) => p.module === module && p.can_view);
}

const NAV_ITEMS: { to: string; label: string; icon: typeof LayoutDashboard; module: ModuleKey }[] =
  [
    { to: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard, module: "dashboard" },
    { to: "/calendar", label: "ปฏิทินงาน", icon: CalendarDays, module: "calendar" },
    { to: "/tasks", label: "จัดการงาน", icon: ClipboardList, module: "tasks" },
    { to: "/notifications", label: "แจ้งเตือน", icon: Bell, module: "notifications" },
    { to: "/audit", label: "บันทึกการใช้งาน", icon: ScrollText, module: "audit" },
    { to: "/settings", label: "ตั้งค่าระบบ", icon: Settings, module: "settings" },
    { to: "/backup", label: "สำรองข้อมูล", icon: DatabaseBackup, module: "backup" },
  ];

function NavLinks({ access, onNavigate }: { access: Access | undefined; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => canView(access, item.module)).map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationBell() {
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listMyNotifications(),
    refetchInterval: 60_000,
  });
  const queryClient = useQueryClient();

  // realtime: เตือนทันทีเมื่อมี notification ใหม่
  useEffect(() => {
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const unread = (notifications ?? []).filter((n: any) => !n.is_read);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="การแจ้งเตือน">
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">การแจ้งเตือนล่าสุด</div>
        <div className="max-h-80 overflow-y-auto">
          {(notifications ?? []).length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              ยังไม่มีการแจ้งเตือน
            </p>
          )}
          {(notifications ?? []).slice(0, 10).map((n: any) => (
            <div
              key={n.id}
              className={cn("border-b px-4 py-3 last:border-0", !n.is_read && "bg-accent/50")}
            >
              <p className="text-sm font-medium">{n.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatThaiDateTime(n.created_at)}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t p-2">
          <Link to="/notifications">
            <Button variant="ghost" size="sm" className="w-full">
              ดูทั้งหมด
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { data: access } = useAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("ออกจากระบบแล้ว");
    navigate({ to: "/auth", replace: true });
  }

  const mobileNav = NAV_ITEMS.filter((item) => canView(access, item.module)).slice(0, 4);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar เดสก์ท็อป */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary">
            <Building2 className="size-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{APP_NAME}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{ORG_NAME}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks access={access} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium">
              {access?.profile?.full_name ?? "ผู้ใช้งาน"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {access?.isAdmin ? "ผู้ดูแลระบบ" : access?.profile?.position || "เจ้าหน้าที่"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60"
          >
            <LogOut className="size-4.5" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="เปิดเมนู">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary">
                  <Building2 className="size-5 text-sidebar-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold">{APP_NAME}</p>
                  <p className="text-xs text-sidebar-foreground/70">{ORG_NAME}</p>
                </div>
              </div>
              <div className="p-3">
                <NavLinks access={access} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-3">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                >
                  <LogOut className="size-4.5" /> ออกจากระบบ
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold lg:text-base">
              {NAV_ITEMS.find((n) => pathname.startsWith(n.to))?.label ?? APP_NAME}
            </p>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>

        {/* Bottom navigation มือถือ */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background lg:hidden">
          {mobileNav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
          <Link
            to="/tasks"
            search={{ create: true }}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus className="size-4" />
            </span>
            สร้างงาน
          </Link>
        </nav>
      </div>
    </div>
  );
}
