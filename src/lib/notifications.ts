import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  recipientId: string;
  notificationId: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  linkUrl: string | null;
  createdAt: string;
  readAt: string | null;
};

type RecipientRow = {
  id: string;
  read_at: string | null;
  notifications:
    | {
        id: string;
        title: string;
        body: string;
        type: string;
        priority: string;
        link_url: string | null;
        created_at: string;
      }
    | Array<{
        id: string;
        title: string;
        body: string;
        type: string;
        priority: string;
        link_url: string | null;
        created_at: string;
      }>
    | null;
};

export async function getUserNotifications(userId: string, unreadOnly = false, limit = 20) {
  const supabase = await createClient();
  let query = supabase
    .from("notification_recipients")
    .select("id,read_at,notifications(id,title,body,type,priority,link_url,created_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) return { notifications: [] as NotificationItem[], error: error.message };

  return {
    notifications: ((data ?? []) as RecipientRow[]).flatMap((row) => {
      const notification = Array.isArray(row.notifications) ? row.notifications[0] : row.notifications;
      if (!notification) return [];
      return [{
        recipientId: row.id,
        notificationId: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        priority: notification.priority,
        linkUrl: notification.link_url,
        createdAt: notification.created_at,
        readAt: row.read_at,
      }];
    }),
    error: "",
  };
}

export async function getAdminNotifications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,body,type,priority,target_type,target_role,link_url,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    rows: (data ?? []) as Array<Record<string, unknown>>,
    error: error?.message ?? "",
  };
}
