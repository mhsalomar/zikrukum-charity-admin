"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { createOperationalRecord } from "@/app/dashboard/operational-actions";
import type { FieldConfig, ResourceConfig } from "@/lib/operational-resources";

export function RecordFormModal({
  config,
  fields,
  buttonLabel,
}: {
  config: ResourceConfig;
  fields: FieldConfig[];
  buttonLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="gold-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[var(--gold)]/25"
      >
        <Plus aria-hidden="true" className="size-5" />
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3 sm:place-items-center">
          <section className="app-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--gold)]">إدخال سريع</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--primary-dark)]">
                  {buttonLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-2xl border border-[var(--line)] bg-[#fffdf8]"
                aria-label="إغلاق النموذج"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <form action={createOperationalRecord} className="mt-5 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="resource" value={config.name} />
              {fields.map((field) => (
                <FormField key={field.name} field={field} />
              ))}
              <div className="md:col-span-2">
                <button className="gold-button h-12 rounded-2xl px-7 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[var(--primary-light)]/20">
                  حفظ
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function FormField({ field }: { field: FieldConfig }) {
  const kind = field.kind ?? "text";
  const baseClass =
    "mt-2 h-12 w-full rounded-2xl border border-[var(--line)] bg-[#fffdf8] px-4 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--gold)] focus:bg-white focus:ring-4 focus:ring-[var(--gold)]/15";

  return (
    <label className="block text-sm font-bold text-[var(--text)]">
      {field.label}
      {field.required ? <span className="text-[var(--danger)]"> *</span> : null}
      {kind === "select" ? (
        <select
          name={field.name}
          className={baseClass}
          defaultValue=""
          required={field.required}
        >
          <option value="">{field.required ? "اختر" : "بدون"}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={field.name}
          type={kind}
          required={field.required}
          placeholder={field.placeholder}
          className={baseClass}
        />
      )}
    </label>
  );
}
