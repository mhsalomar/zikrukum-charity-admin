import { createClient } from "@/lib/supabase/server";

export type MediaWorkspacePost = {
  id: string;
  title: string;
  status: string;
  contentType: string;
  category: string;
  summary: string;
  proposedPublishDate: string;
  createdAt: string;
  authorName: string;
};

export type MediaWorkspaceData = {
  total: number;
  draft: number;
  ready: number;
  approved: number;
  published: number;
  upcoming: number;
  missingSummary: number;
  recent: MediaWorkspacePost[];
  readyQueue: MediaWorkspacePost[];
  drafts: MediaWorkspacePost[];
  publishCalendar: MediaWorkspacePost[];
  typeBreakdown: Array<{ label: string; value: number }>;
};

export const mediaStatusLabels: Record<string, string> = {
  draft: "مسودة",
  ready_for_review: "جاهز للمراجعة",
  approved: "معتمد",
  published: "منشور داخليًا",
  archived: "مؤرشف",
};

export const mediaTypeLabels: Record<string, string> = {
  news: "خبر",
  announcement: "إعلان",
  coverage: "تغطية",
  achievement: "إنجاز",
  program: "برنامج",
  competition: "مسابقة",
  circular: "تعميم",
  other: "أخرى",
};

type RawPost = Record<string, unknown>;

export async function getMediaWorkspaceData(): Promise<MediaWorkspaceData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_posts")
    .select("id,title,status,content_type,category,summary,proposed_publish_date,created_at,author_name")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("media-workspace-load-error", error);
    return emptyData();
  }

  const rows = ((data ?? []) as RawPost[]).map((row) => ({
    id: text(row.id),
    title: text(row.title) || "مادة بدون عنوان",
    status: text(row.status) || "draft",
    contentType: text(row.content_type) || "other",
    category: text(row.category),
    summary: text(row.summary),
    proposedPublishDate: text(row.proposed_publish_date),
    createdAt: text(row.created_at),
    authorName: text(row.author_name),
  }));
  const today = new Date().toISOString().slice(0, 10);
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const until = twoWeeks.toISOString().slice(0, 10);

  return {
    total: rows.length,
    draft: rows.filter((row) => row.status === "draft").length,
    ready: rows.filter((row) => row.status === "ready_for_review").length,
    approved: rows.filter((row) => row.status === "approved").length,
    published: rows.filter((row) => row.status === "published").length,
    upcoming: rows.filter((row) => row.proposedPublishDate >= today && row.proposedPublishDate <= until).length,
    missingSummary: rows.filter((row) => !row.summary).length,
    recent: rows.slice(0, 6),
    readyQueue: rows.filter((row) => row.status === "ready_for_review").slice(0, 6),
    drafts: rows.filter((row) => row.status === "draft").slice(0, 6),
    publishCalendar: rows
      .filter((row) => row.proposedPublishDate >= today)
      .sort((a, b) => a.proposedPublishDate.localeCompare(b.proposedPublishDate))
      .slice(0, 6),
    typeBreakdown: buildTypeBreakdown(rows),
  };
}

function buildTypeBreakdown(rows: MediaWorkspacePost[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = mediaTypeLabels[row.contentType] ?? "غير مصنف";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function emptyData(): MediaWorkspaceData {
  return {
    total: 0,
    draft: 0,
    ready: 0,
    approved: 0,
    published: 0,
    upcoming: 0,
    missingSummary: 0,
    recent: [],
    readyQueue: [],
    drafts: [],
    publishCalendar: [],
    typeBreakdown: [],
  };
}

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
