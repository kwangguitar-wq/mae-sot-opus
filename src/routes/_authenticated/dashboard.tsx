import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock, CalendarRange, CalendarDays, AlertTriangle, Flame, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { getDashboardStats } from "@/lib/work.functions";
import { APP_NAME, ORG_NAME, STATUS_LABELS, formatThaiDate } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge, StatusBadge, CategoryDot } from "@/components/badges";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: `แดชบอร์ด — ${APP_NAME} ${ORG_NAME}` },
      { name: "description", content: "สรุปภาพรวมงานประชาสัมพันธ์ วันนี้ สัปดาห์นี้ เดือนนี้ และสถิติงาน" },
      { property: "og:title", content: `แดชบอร์ด — ${APP_NAME}` },
      { property: "og:description", content: "สรุปภาพรวมงานประชาสัมพันธ์และสถิติ" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "#d97706",
  in_progress: "#0284c7",
  completed: "#059669",
  cancelled: "#94a3b8",
};

function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-muted-foreground">โหลดข้อมูลแดชบอร์ดไม่สำเร็จ</p>
        <Button variant="outline" onClick={() => refetch()}>ลองอีกครั้ง</Button>
      </div>
    );
  }

  const summaryCards = [
    { label: "งานวันนี้", value: stats?.todayCount, icon: CalendarClock },
    { label: "งานสัปดาห์นี้", value: stats?.weekCount, icon: CalendarRange },
    { label: "งานเดือนนี้", value: stats?.monthCount, icon: CalendarDays },
    { label: "งานด่วนค้างอยู่", value: stats?.urgent.length, icon: Flame },
    { label: "งานค้างเกินกำหนด", value: stats?.overdue.length, icon: AlertTriangle },
  ];

  const statusData = Object.entries(stats?.byStatus ?? {}).map(([k, v]) => ({
    name: STATUS_LABELS[k] ?? k, value: v as number, key: k,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold lg:text-2xl">แดชบอร์ด</h1>
        <Link to="/tasks">
          <Button variant="outline" size="sm">
            ดูงานทั้งหมด <ArrowRight className="ml-1 size-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <c.icon className="size-5 text-primary" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <p className="text-2xl font-bold">{c.value ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">สถิติตามประเภทงาน</CardTitle></CardHeader>
          <CardContent className="h-72">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.byCategory ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={150} fontSize={12} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="จำนวนงาน" radius={[0, 4, 4, 0]}>
                    {(stats?.byCategory ?? []).map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">สถิติตามสถานะ</CardTitle></CardHeader>
          <CardContent className="h-72">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {statusData.map((s) => (
                      <Cell key={s.key} fill={STATUS_COLORS[s.key] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">ภาระงานตามผู้รับผิดชอบ</CardTitle></CardHeader>
          <CardContent className="h-72">
            {isLoading ? <Skeleton className="h-full w-full" /> : (stats?.byAssignee.length ?? 0) === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                ยังไม่มีการมอบหมายงาน
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.byAssignee ?? []} margin={{ left: 8, right: 16 }}>
                  <XAxis dataKey="name" fontSize={11} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" name="จำนวนงาน" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">งานวันนี้ ({formatThaiDate(new Date())})</CardTitle></CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (stats?.today.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">วันนี้ไม่มีงานที่กำหนดไว้</p>
            ) : (
              stats?.today.map((w: any) => (
                <div key={w.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <CategoryDot color={w.category?.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.start_time?.slice(0, 5) ?? "—"} น. · {w.category?.name ?? "ไม่ระบุประเภท"}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {(stats?.urgent.length ?? 0) + (stats?.overdue.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">งานด่วนที่ยังไม่เสร็จ</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {stats?.urgent.map((w: any) => (
                <div key={w.id} className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">{formatThaiDate(w.work_date)}</p>
                  </div>
                  <PriorityBadge priority={w.priority} />
                </div>
              ))}
              {(stats?.urgent.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">ไม่มีงานด่วนค้าง</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">งานค้างเกินกำหนด</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {stats?.overdue.map((w: any) => (
                <div key={w.id} className="flex items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">กำหนด {formatThaiDate(w.work_date)}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
              {(stats?.overdue.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">ไม่มีงานค้าง</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
