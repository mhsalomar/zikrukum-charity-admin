"use client";

export function AttendanceSelectAll({ formId }: { formId: string }) {
  function selectAll(status: string) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const radios = form.querySelectorAll<HTMLInputElement>(`input[type="radio"][value="${status}"]`);
    radios.forEach((radio) => {
      radio.checked = true;
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => selectAll("present")}
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
      >
        ✓ الكل حاضر
      </button>
      <button
        type="button"
        onClick={() => selectAll("absent")}
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
      >
        الكل غائب
      </button>
    </div>
  );
}
