import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { listWorkItems } from "@/lib/work.functions";
import { APP_NAME, ORG_NAME, THAI_DAYS_SHORT, THAI_MONTHS, formatThaiDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { WorkItemDialog } from "@/components/WorkItemDialog";
import { WorkItemDetail } from "@/components/WorkItemDetail";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: `ปฏิทินงาน — ${APP_NAME} ${ORG_NAME}` },
      { name: "description", content: "ปฏิทินงานประชาสัมพันธ์ มุมมองรายวัน สัปดาห์ เดือน และปี" },
      { property: "og:title", content: `ปฏิทินงาน — ${APP_NAME}` },
      {
        property: "og:description",
        content: "ปฏิทินงานประชาสัมพันธ์ มุมมองรายวัน สัปดาห์ เดือน และปี",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

type View = "day" | "week" | "month" | "year";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarPage() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [detail, setDetail] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();
  const queryClient = useQueryClient();

  const range = useMemo(() => {
    const d = new Date(cursor);
    if (view === "day") return { from: toISO(d), to: toISO(d) };
    if (view === "week") {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toISO(start), to: toISO(end) };
    }
    if (view === "month") {
      return {
        from: toISO(new Date(d.getFullYear(), d.getMonth(), 1)),
        to: toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      };
    }
    return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
  }, [view, cursor]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["work-items", range.from, range.to],
    queryFn: () => listWorkItems({ data: { from: range.from, to: range.to } }),
  });

  const byDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const w of items ?? []) {
      (map[(w as any).work_date] ??= []).push(w);
    }
    return map;
  }, [items]);

  function move(dir: number) {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCursor(d);
  }

  function title() {
    const d = cursor;
    if (view === "day") return formatThaiDate(d);
    if (view === "week") return `สัปดาห์ของ ${formatThaiDate(range.from)}`;
    if (view === "month") return `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
    return `ปี ${d.getFullYear() + 543}`;
  }

  function openCreate(dateISO: string) {
    setCreateDate(dateISO);
    setCreateOpen(true);
  }

  const todayISO = toISO(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold lg:text-2xl">ปฏิทินงาน</h1>
        <Button onClick={() => openCreate(todayISO)}>
          <Plus className="mr-1 size-4" /> สร้างงาน
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="ก่อนหน้า">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            วันนี้
          </Button>
          <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="ถัดไป">
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-sm font-semibold">{title()}</span>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">วัน</TabsTrigger>
            <TabsTrigger value="week">สัปดาห์</TabsTrigger>
            <TabsTrigger value="month">เดือน</TabsTrigger>
            <TabsTrigger value="year">ปี</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === "month" ? (
        <MonthView
          cursor={cursor}
          byDate={byDate}
          todayISO={todayISO}
          onSelect={(iso) => {
            setCursor(new Date(iso));
            setView("day");
          }}
          onCreate={openCreate}
        />
      ) : view === "year" ? (
        <YearView
          cursor={cursor}
          byDate={byDate}
          onSelectMonth={(m) => {
            const d = new Date(cursor);
            d.setMonth(m);
            setCursor(d);
            setView("month");
          }}
        />
      ) : (
        <ListView byDate={byDate} range={range} onOpen={setDetail} />
      )}

      <WorkItemDetail
        item={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onEdit={(it) => {
          setDetail(null);
          setEditing(it);
        }}
      />
      <WorkItemDialog
        open={createOpen || !!editing}
        item={editing}
        defaultDate={createDate}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditing(null);
            queryClient.invalidateQueries();
          }
        }}
      />
    </div>
  );
}

function MonthView({
  cursor,
  byDate,
  todayISO,
  onSelect,
  onCreate,
}: {
  cursor: Date;
  byDate: Record<string, any[]>;
  todayISO: string;
  onSelect: (iso: string) => void;
  onCreate: (iso: string) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const blanks = first.getDay();
  const cells: (string | null)[] = [
    ...Array<null>(blanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toISO(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
    ),
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
        {THAI_DAYS_SHORT.map((d, i) => (
          <div key={i} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((iso, i) => (
          <div
            key={i}
            className={cn(
              "group min-h-16 border-b border-r p-1.5 sm:min-h-24 [&:nth-child(7n)]:border-r-0",
              !iso && "bg-muted/30",
            )}
          >
            {iso && (
              <>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onSelect(iso)}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      iso === todayISO ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    {Number(iso.slice(8))}
                  </button>
                  <button
                    onClick={() => onCreate(iso)}
                    className="hidden rounded p-0.5 text-muted-foreground hover:bg-accent group-hover:block"
                    aria-label="สร้างงานวันนี้"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="mt-1 space-y-0.5">
                  {(byDate[iso] ?? []).slice(0, 2).map((w: any) => (
                    <button
                      key={w.id}
                      onClick={() => onSelect(iso)}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-primary-foreground sm:text-xs"
                      style={{ backgroundColor: w.category?.color ?? "#2563eb" }}
                    >
                      {w.start_time ? `${w.start_time.slice(0, 5)} ` : ""}
                      {w.title}
                    </button>
                  ))}
                  {(byDate[iso]?.length ?? 0) > 2 && (
                    <button
                      onClick={() => onSelect(iso)}
                      className="px-1 text-[10px] text-muted-foreground hover:underline"
                    >
                      +{(byDate[iso]?.length ?? 0) - 2} งาน
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function YearView({
  cursor,
  byDate,
  onSelectMonth,
}: {
  cursor: Date;
  byDate: Record<string, any[]>;
  onSelectMonth: (m: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {THAI_MONTHS.map((m, i) => {
        const prefix = `${cursor.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
        const count = Object.entries(byDate)
          .filter(([d]) => d.startsWith(prefix))
          .reduce((s, [, v]) => s + v.length, 0);
        return (
          <button
            key={m}
            onClick={() => onSelectMonth(i)}
            className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <p className="font-semibold">{m}</p>
            <p className="mt-1 text-2xl font-bold text-primary">{count}</p>
            <p className="text-xs text-muted-foreground">งาน</p>
          </button>
        );
      })}
    </div>
  );
}

function ListView({
  byDate,
  range,
  onOpen,
}: {
  byDate: Record<string, any[]>;
  range: { from: string; to: string };
  onOpen: (w: any) => void;
}) {
  const days: string[] = [];
  const d = new Date(range.from);
  while (toISO(d) <= range.to) {
    days.push(toISO(d));
    d.setDate(d.getDate() + 1);
  }
  const hasAny = days.some((iso) => (byDate[iso]?.length ?? 0) > 0);

  if (!hasAny) {
    return (
      <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
        ไม่มีงานในช่วงเวลานี้
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days
        .filter((iso) => (byDate[iso]?.length ?? 0) > 0)
        .map((iso) => (
          <div key={iso}>
            <p className="mb-2 text-sm font-semibold">{formatThaiDate(iso)}</p>
            <div className="space-y-2">
              {(byDate[iso] ?? []).map((w: any) => (
                <button
                  key={w.id}
                  onClick={() => onOpen(w)}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: w.category?.color ?? "#94a3b8" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.start_time ? `${w.start_time.slice(0, 5)} น.` : "ทั้งวัน"} ·{" "}
                      {w.category?.name ?? "ไม่ระบุประเภท"}
                      {(w.assignees?.length ?? 0) > 0 &&
                        ` · ${w.assignees
                          .map((a: any) => a.profile?.full_name)
                          .filter(Boolean)
                          .join(", ")}`}
                    </p>
                  </div>
                  <StatusBadge status={w.status} />
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
