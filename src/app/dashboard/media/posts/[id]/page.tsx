import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAnyRole } from "@/lib/auth";
import { mediaRoles } from "@/lib/module-access";
import { createClient } from "@/lib/supabase/server";

export default async function MediaPostDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <MediaPostDetails params={params} basePath="/dashboard/media/posts" />;
}

export async function MediaPostDetails({ params, basePath }: { params: Promise<{ id: string }>; basePath: string }) {
  await requireAnyRole([...mediaRoles]);
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <div className="space-y-5">
      <section className="app-card luxury-pattern overflow-hidden rounded-[1.7rem]">
        <div className="relative border-r-4 border-[var(--gold)] p-5 sm:p-7">
          <p className="text-sm font-semibold text-[var(--gold)]">المركز الإعلامي</p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--primary-dark)] sm:text-4xl">{post.title}</h1>
          <p className="mt-3 text-sm font-bold text-[var(--muted)]">
            {post.category || "تصنيف غير محدد"} · {post.status || "مسودة"}
          </p>
          <Link href={basePath} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--primary-dark)]">
            العودة
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </div>
      </section>
      <section className="app-card rounded-[1.6rem] p-5 sm:p-7">
        <p className="text-xs font-semibold text-[var(--gold)]">الملخص</p>
        <p className="mt-3 text-sm font-bold leading-8 text-[var(--text)]">{post.summary || "لم يضف ملخص بعد."}</p>
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[#fffdf8] p-5">
          <p className="text-xs font-semibold text-[var(--gold)]">المحتوى</p>
          <p className="mt-3 whitespace-pre-line text-sm font-bold leading-8 text-[var(--text)]">{post.content || "لم يضف محتوى بعد."}</p>
        </div>
        {post.external_asset_url ? (
          <a href={post.external_asset_url} className="mt-5 inline-flex rounded-2xl border border-[var(--gold)]/40 bg-[#fff8e6] px-4 py-3 text-sm font-semibold text-[#765514]">
            فتح الرابط الخارجي
          </a>
        ) : null}
      </section>
    </div>
  );
}

async function getPost(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("media_posts").select("*").eq("id", id).maybeSingle();
  return data as Record<string, string | null> | null;
}
