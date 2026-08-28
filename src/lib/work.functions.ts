import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const filtersSchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  locationId: z.string().optional(),
});

const workItemInput = z.object({
  title: z.string().trim().min(1, "กรุณาระบุชื่องาน").max(200),
  description: z.string().trim().max(5000).optional().default(""),
  category_id: z.string().uuid().nullable().optional(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  location_text: z.string().trim().max(300).optional().default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  note: z.string().trim().max(2000).optional().default(""),
  attachment_url: z.string().nullable().optional(),
  attachment_name: z.string().nullable().optional(),
  assignee_ids: z.array(z.string().uuid()).default([]),
});

type SupabaseCtx = { supabase: any; userId: string };

async function writeAudit(
  ctx: SupabaseCtx,
  action: string,
  entity: string,
  entityId: string | null,
  details: Record<string, unknown>,
) {
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("full_name")
    .eq("id", ctx.userId)
    .maybeSingle();
  await ctx.supabase.from("audit_logs").insert({
    user_id: ctx.userId,
    user_name: profile?.full_name ?? "",
    action,
    entity,
    entity_id: entityId,
    details,
  });
}

async function notifyAssignees(
  ctx: SupabaseCtx,
  assigneeIds: string[],
  title: string,
  body: string,
  workItemId: string,
  type: string,
) {
  const targets = assigneeIds.filter((id) => id !== ctx.userId);
  if (targets.length === 0) return;
  await ctx.supabase.from("notifications").insert(
    targets.map((uid) => ({
      user_id: uid,
      title,
      body,
      type,
      work_item_id: workItemId,
    })),
  );
}

// ===== อ่านข้อมูล =====

export const listWorkItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => filtersSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    let query = ctx.supabase
      .from("work_items")
      .select(
        "*, category:categories(id, name, color), location:locations(id, name), assignees:work_assignees(user_id, profile:profiles(id, full_name, position))",
      )
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false });

    if (data.q) query = query.or(`title.ilike.%${data.q}%,description.ilike.%${data.q}%,location_text.ilike.%${data.q}%`);
    if (data.from) query = query.gte("work_date", data.from);
    if (data.to) query = query.lte("work_date", data.to);
    if (data.categoryId) query = query.eq("category_id", data.categoryId);
    if (data.status) query = query.eq("status", data.status);
    if (data.priority) query = query.eq("priority", data.priority);
    if (data.locationId) query = query.eq("location_id", data.locationId);

    const { data: items, error } = await query.limit(1000);
    if (error) throw new Error(error.message);

    let result = items ?? [];
    if (data.assigneeId) {
      result = result.filter((w: any) =>
        (w.assignees ?? []).some((a: any) => a.user_id === data.assigneeId),
      );
    }
    return result;
  });

export const getWorkItem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: item, error } = await ctx.supabase
      .from("work_items")
      .select(
        "*, category:categories(id, name, color), location:locations(id, name), assignees:work_assignees(user_id, profile:profiles(id, full_name, position)), creator:profiles!work_items_created_by_fkey(id, full_name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return item;
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: items, error } = await ctx.supabase
      .from("work_items")
      .select(
        "id, title, work_date, start_time, end_time, priority, status, is_demo, category:categories(name, color), assignees:work_assignees(user_id, profile:profiles(full_name))",
      )
      .order("work_date", { ascending: true });
    if (error) throw new Error(error.message);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay() + 6) % 7 || 7);
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEnd = monthEndDate.toISOString().slice(0, 10);
    const weekEndISO = weekEnd.toISOString().slice(0, 10);

    const all = items ?? [];
    const open = (w: any) => w.status === "pending" || w.status === "in_progress";

    const byCategory: Record<string, { name: string; color: string; count: number }> = {};
    const byStatus: Record<string, number> = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    const byAssignee: Record<string, { name: string; count: number }> = {};

    for (const w of all) {
      const cat = (w as any).category;
      const cname = cat?.name ?? "ไม่ระบุประเภท";
      if (!byCategory[cname]) byCategory[cname] = { name: cname, color: cat?.color ?? "#94a3b8", count: 0 };
      byCategory[cname].count++;
      byStatus[(w as any).status] = (byStatus[(w as any).status] ?? 0) + 1;
      for (const a of (w as any).assignees ?? []) {
        const n = a.profile?.full_name ?? "ไม่ระบุ";
        if (!byAssignee[n]) byAssignee[n] = { name: n, count: 0 };
        byAssignee[n].count++;
      }
    }

    return {
      today: all.filter((w: any) => w.work_date === today),
      todayCount: all.filter((w: any) => w.work_date === today).length,
      weekCount: all.filter((w: any) => w.work_date >= today && w.work_date <= weekEndISO).length,
      monthCount: all.filter((w: any) => w.work_date >= monthStart && w.work_date <= monthEnd).length,
      urgent: all.filter((w: any) => w.priority === "urgent" && open(w)),
      overdue: all.filter((w: any) => open(w) && w.work_date < today),
      total: all.length,
      byCategory: Object.values(byCategory),
      byStatus,
      byAssignee: Object.values(byAssignee).sort((a, b) => b.count - a.count).slice(0, 8),
    };
  });

export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("id, full_name, position")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data, error } = await ctx.supabase.from("categories").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data, error } = await ctx.supabase.from("locations").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const [{ data: roles }, { data: perms }, { data: profile }] = await Promise.all([
      ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId),
      ctx.supabase.from("user_permissions").select("*").eq("user_id", ctx.userId),
      ctx.supabase.from("profiles").select("*").eq("id", ctx.userId).maybeSingle(),
    ]);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    return { isAdmin, permissions: perms ?? [], profile, userId: ctx.userId };
  });

// ===== เขียนข้อมูล =====

export const createWorkItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => workItemInput.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: canCreate } = await ctx.supabase.rpc("has_permission", {
      _user_id: ctx.userId, _module: "tasks", _action: "create",
    });
    if (!canCreate) throw new Error("คุณไม่มีสิทธิ์สร้างงาน");

    const { assignee_ids, ...fields } = data;
    const { data: item, error } = await ctx.supabase
      .from("work_items")
      .insert({ ...fields, created_by: ctx.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (assignee_ids.length > 0) {
      await ctx.supabase
        .from("work_assignees")
        .insert(assignee_ids.map((uid) => ({ work_item_id: item.id, user_id: uid })));
    }

    await writeAudit(ctx, "create", "work_item", item.id, { title: data.title, work_date: data.work_date });
    await notifyAssignees(ctx, assignee_ids, "มีงานใหม่มอบหมายให้คุณ", data.title, item.id, "assignment");
    const { notifyLineWorkEvent } = await import("./line.server");
    const line = await notifyLineWorkEvent(ctx.supabase, "create", item);
    return { ...item, line_notification: { sent: line.sent, message: line.message } };
  });

export const updateWorkItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), data: workItemInput }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: canEdit } = await ctx.supabase.rpc("has_permission", {
      _user_id: ctx.userId, _module: "tasks", _action: "edit",
    });
    if (!canEdit) throw new Error("คุณไม่มีสิทธิ์แก้ไขงาน");

    const { id, data: payload } = data;
    const { assignee_ids, ...fields } = payload;
    const { data: item, error } = await ctx.supabase
      .from("work_items")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await ctx.supabase.from("work_assignees").delete().eq("work_item_id", id);
    if (assignee_ids.length > 0) {
      await ctx.supabase
        .from("work_assignees")
        .insert(assignee_ids.map((uid) => ({ work_item_id: id, user_id: uid })));
    }

    await writeAudit(ctx, "update", "work_item", id, { title: payload.title, changes: fields });
    await notifyAssignees(ctx, assignee_ids, "งานของคุณมีการปรับปรุง", payload.title, id, "update");
    const { notifyLineWorkEvent } = await import("./line.server");
    const line = await notifyLineWorkEvent(ctx.supabase, "update", item);
    return { ...item, line_notification: { sent: line.sent, message: line.message } };
  });

export const deleteWorkItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data: canDelete } = await ctx.supabase.rpc("has_permission", {
      _user_id: ctx.userId, _module: "tasks", _action: "delete",
    });
    if (!canDelete) throw new Error("คุณไม่มีสิทธิ์ลบงาน");

    const { data: existing } = await ctx.supabase
      .from("work_items").select("title").eq("id", data.id).maybeSingle();
    const { error } = await ctx.supabase.from("work_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await writeAudit(ctx, "delete", "work_item", data.id, { title: existing?.title ?? "" });
    return { ok: true };
  });

// ===== การแจ้งเตือน =====

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { data, error } = await ctx.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { error } = await ctx.supabase
      .from("notifications").update({ is_read: true })
      .eq("id", data.id).eq("user_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as SupabaseCtx;
    const { error } = await ctx.supabase
      .from("notifications").update({ is_read: true })
      .eq("user_id", ctx.userId).eq("is_read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Audit log =====

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ entity: z.string().optional(), limit: z.number().min(1).max(500).default(200) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as SupabaseCtx;
    let query = ctx.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.entity) query = query.eq("entity", data.entity);
    const { data: logs, error } = await query;
    if (error) throw new Error(error.message);
    return logs ?? [];
  });
