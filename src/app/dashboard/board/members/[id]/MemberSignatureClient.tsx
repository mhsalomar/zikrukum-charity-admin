"use client";

import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { removeMemberSignature, uploadMemberSignature } from "./signature-actions";

type Props = {
  memberId: string;
  currentSignatureUrl: string | null;
  memberName: string;
};

export function MemberSignatureClient({ memberId, currentSignatureUrl, memberName }: Props) {
  const [sigUrl, setSigUrl] = useState<string | null>(currentSignatureUrl);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("يرجى اختيار ملف صورة.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الصورة يجب ألا يتجاوز 2 ميجابايت.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.set("member_id", memberId);
      formData.set("file", file);

      const result = await uploadMemberSignature(formData);
      if (result.error || !result.url) {
        throw new Error(result.error ?? "حدث خطأ أثناء الرفع");
      }

      setSigUrl(result.url);
      setNotice("✓ تم رفع التوقيع بنجاح");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const result = await removeMemberSignature(memberId);
      if (result.error) throw new Error(result.error);

      setSigUrl(null);
      setNotice("✓ تم حذف التوقيع");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-[1.4rem] border border-[var(--line,#e5e7eb)] bg-white p-5" dir="rtl">
      <h2 className="mb-4 border-r-4 border-[#c8a45d] pr-3 text-base font-semibold text-[#075f4d]">التوقيع المحفوظ</h2>

      {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
      {notice && <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">{notice}</div>}

      {sigUrl ? (
        <div className="flex flex-col items-start gap-4">
          <div className="rounded-xl border border-[#dbe7dd] bg-[#fffdf8] p-4">
            <p className="mb-2 text-xs font-semibold text-[#667c74]">التوقيع الحالي لـ {memberName}</p>
            <img
              src={sigUrl}
              alt={`توقيع ${memberName}`}
              className="max-h-24 max-w-[200px] object-contain"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dbe7dd] bg-[#fffdf8] px-4 py-2 text-xs font-semibold text-[#075f4d] hover:bg-[#f0f7f5] disabled:opacity-60"
            >
              <Upload className="size-3.5" />
              تغيير التوقيع
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="size-3.5" />
              حذف التوقيع
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[#667c74]">لا يوجد توقيع محفوظ لهذا العضو.</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#c8a45d] bg-[#fff8e6] px-5 py-2.5 text-sm font-semibold text-[#765514] hover:bg-[#fff3d6] disabled:opacity-60"
          >
            <Upload className="size-4" />
            {uploading ? "جارٍ الرفع..." : "رفع التوقيع"}
          </button>
          <p className="text-xs text-[#9ca3af]">PNG أو JPG — الحد الأقصى 2 ميجابايت. يُستخدم في محاضر الاجتماعات.</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </section>
  );
}
