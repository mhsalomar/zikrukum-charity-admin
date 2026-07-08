import Link from "next/link";
import { CalendarClock, CheckCircle2, CircleAlert, ClipboardList, ExternalLink, PlayCircle } from "lucide-react";

import { archiveTaskAction, createTaskAction, updateAdminTaskAction, updateOwnTaskAction } from "@/app/dashboard/tasks/actions";
import { EmptyState, KpiCard, PageHero, SectionCard, StatusChip } from "@/components/dashboard-ui";
import { taskPriorityLabels, taskRoleLabels, taskStatusLabels, type InternalTask, type TaskPerson } from "@/lib/internal-tasks";

export function TaskWorkspace({
  data,
  people = [],
  basePath,
  title,
  currentTab = "",
}: {
  data: {
    userId: string;
    isAdmin: boolean;
    canSeeAll: boolean;
    tasks: InternalTask[];
    error: string;
    summary: { newCount: number; inProgressCount: number; completedCount: number; overdueCount: number };
  };
  people?: TaskPerson[];
  basePath: string;
  title: string;
  currentTab?: string;
}) {
  return (
    <div className="space-y-5">
      <PageHero eyebrow="المهام الداخلية" title={title} description={data.isAdmin ? "إدارة المهام الفردية والتوزيعات." : "مهامك وحالة التنفيذ."} actions={data.isAdmin ? <Link href="/dashboard/tasks/distributions/new" className="primary-button inline-flex min-h-12 items-center rounded-xl px-5 text-sm font-semibold">توزيع مهام جديد</Link> : undefined} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="مهام جديدة" value={data.summary.newCount} icon={ClipboardList} />
        <KpiCard label="قيد العمل" value={data.summary.inProgressCount} icon={PlayCircle} tone="warning" />
        <KpiCard label="متأخرة" value={data.summary.overdueCount} icon={CircleAlert} tone={data.summary.overdueCount ? "warning" : "success"} />
        <KpiCard label="تم الإنجاز" value={data.summary.completedCount} icon={CheckCircle2} tone="success" />
      </div>

      {data.isAdmin ? <CreateTaskForm people={people} /> : null}
      <TaskFilters basePath={basePath} people={data.isAdmin ? people : []} currentTab={currentTab} />

      <SectionCard title={data.canSeeAll ? "كل المهام" : "مهامي"} description="المهام المتأخرة تظهر بوضوح، وتُحفظ ملاحظة المنفذ ووقت الإنجاز.">
        {data.error ? <EmptyState title="تعذر تحميل المهام" description="حاول مرة أخرى أو تواصل مع الإدارة." /> : data.tasks.length === 0 ? <EmptyState title="لا توجد مهام ضمن هذا العرض" description="لا توجد مهام معلقة أو مطابقة للتصفية الحالية." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.tasks.map((task) => <TaskCard key={task.id} task={task} isAdmin={data.isAdmin} currentUserId={data.userId} people={people} />)}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function CreateTaskForm({ people }: { people: TaskPerson[] }) {
  return (
    <SectionCard title="إضافة مهمة" description="يمكن الإسناد لشخص محدد أو لجميع أصحاب دور محدد.">
      <form action={createTaskAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="عنوان المهمة"><input name="title" required className={inputClass} /></Field>
        <Field label="طريقة الإسناد"><select name="target_type" className={inputClass}><option value="user">شخص محدد</option><option value="role">جميع أصحاب دور</option></select></Field>
        <Field label="الشخص المسؤول"><select name="assigned_user_id" className={inputClass}><option value="">اختر عند الإسناد لشخص</option>{people.map((person) => <option key={person.userId} value={person.userId}>{person.name} — {person.email}</option>)}</select></Field>
        <Field label="الدور المستهدف"><select name="target_role" className={inputClass}><option value="">اختر عند الإسناد لدور</option>{Object.entries(taskRoleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="الأولوية"><select name="priority" className={inputClass}><option value="normal">عادية</option><option value="important">مهمة</option><option value="urgent">عاجلة</option></select></Field>
        <Field label="تاريخ الاستحقاق"><input type="date" name="due_date" className={inputClass} /></Field>
        <Field label="رابط داخلي اختياري"><input name="linked_url" dir="ltr" className={inputClass} placeholder="الصق رابط صفحة من داخل المنصة" /></Field>
        <Field label="ملاحظة الإدارة"><input name="admin_note" className={inputClass} /></Field>
        <label className="text-sm font-semibold text-[var(--primary-dark)] md:col-span-2 xl:col-span-3">وصف المهمة<textarea name="description" rows={3} className={inputClass} /></label>
        <div className="md:col-span-2 xl:col-span-3"><button className="primary-button min-h-12 rounded-xl px-6 text-sm font-semibold">إرسال المهمة</button></div>
      </form>
    </SectionCard>
  );
}

function TaskFilters({ basePath, people, currentTab }: { basePath: string; people: TaskPerson[]; currentTab: string }) {
  return (
    <div className="app-card grid gap-3 rounded-2xl p-3">
      <div className="flex flex-wrap gap-2">
        {[["", "كل المهام"], ["mine", "مهامي"], ["overdue", "المتأخرة"], ["completed", "المنجزة"], ["not_completed", "غير المنجزة"]].map(([tab, label]) => {
          const isActive = tab === currentTab;
          return (
            <Link key={tab} href={`${basePath}${tab ? `?tab=${tab}` : ""}`} className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold transition ${isActive ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--primary-dark)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"}`}>{label}</Link>
          );
        })}
      </div>
      <form className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <input name="q" className={inputClass} placeholder="بحث بعنوان المهمة" />
        <select name="status" className={inputClass}><option value="">كل الحالات</option>{Object.entries(taskStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select name="priority" className={inputClass}><option value="">كل الأولويات</option>{Object.entries(taskPriorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        {people.length ? <select name="assignee" className={inputClass}><option value="">كل المسؤولين</option>{people.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select> : <span className="hidden xl:block" />}
        <input type="date" name="due" className={inputClass} aria-label="تاريخ الاستحقاق" />
        <button className="primary-button min-h-11 rounded-xl px-4 text-sm font-semibold">تطبيق التصفية</button>
      </form>
    </div>
  );
}

function TaskCard({ task, isAdmin, currentUserId, people }: { task: InternalTask; isAdmin: boolean; currentUserId: string; people: TaskPerson[] }) {
  const target = task.temporaryAssigneeName || (task.targetType === "role" ? taskRoleLabels[task.targetRole] ?? task.targetRole : task.assigneeName || "مستخدم محدد");
  return (
    <article className={`rounded-2xl border p-4 ${task.overdue ? "border-red-200 bg-red-50" : "border-[var(--border)] bg-white"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-lg font-bold text-[var(--primary-dark)]">{task.title}</h3><p className="mt-1 text-xs font-bold text-[var(--muted)]">المسؤول: {target} · أنشأها: {task.creatorName}</p></div>
        <div className="flex flex-wrap gap-2"><StatusChip tone={task.status === "completed" ? "success" : task.overdue ? "warning" : "default"}>{task.overdue ? "متأخرة" : taskStatusLabels[task.status]}</StatusChip><StatusChip tone={task.priority === "urgent" ? "warning" : "default"}>{taskPriorityLabels[task.priority]}</StatusChip></div>
      </div>
      {task.description ? <p className="mt-3 text-sm font-semibold leading-7 text-[var(--muted)]">{task.description}</p> : null}
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[var(--muted)]"><span className="inline-flex items-center gap-1"><CalendarClock className="size-4" />الاستحقاق: {formatDate(task.dueDate)}</span>{task.completedAt ? <span>أُنجز: {formatDate(task.completedAt)}</span> : null}</div>
      {task.linkedUrl ? <Link href={task.linkedUrl} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] underline underline-offset-4"><ExternalLink className="size-4" />فتح الصفحة المرتبطة</Link> : null}
      {task.executorNote ? <p className="mt-3 rounded-xl bg-[var(--bg)] p-3 text-sm font-bold text-[var(--primary-dark)]">ملاحظة المنفذ: {task.executorNote}</p> : null}
      {task.adminNote ? <p className="mt-2 text-xs font-bold text-[var(--gold)]">ملاحظة الإدارة: {task.adminNote}</p> : null}
      {isAdmin ? <AdminTaskForm task={task} people={people} /> : task.assignedUserId === currentUserId || task.targetType === "role" ? <AssigneeTaskForm task={task} /> : null}
    </article>
  );
}

function AssigneeTaskForm({ task }: { task: InternalTask }) {
  return (
    <form action={updateOwnTaskAction} className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4">
      <input type="hidden" name="task_id" value={task.id} />
      <select name="status" defaultValue={task.status === "new" ? "in_progress" : task.status} className={inputClass}><option value="in_progress">قيد العمل</option><option value="completed">تم الإنجاز</option><option value="not_completed">لم يتم الإنجاز</option></select>
      <textarea name="executor_note" defaultValue={task.executorNote} rows={2} className={inputClass} placeholder="ملاحظة الإنجاز أو سبب عدم الإنجاز" />
      <button className="primary-button min-h-11 rounded-xl px-4 text-sm font-semibold">حفظ تحديث المهمة</button>
    </form>
  );
}

function AdminTaskForm({ task, people }: { task: InternalTask; people: TaskPerson[] }) {
  return (
    <details className="mt-4 border-t border-[var(--border)] pt-4">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--primary)]">تعديل ومراجعة المهمة</summary>
      <form action={updateAdminTaskAction} className="mt-3 grid gap-2">
        <input type="hidden" name="task_id" value={task.id} />
        <input name="title" defaultValue={task.title} required className={inputClass} />
        <textarea name="description" defaultValue={task.description} rows={2} className={inputClass} />
        <select name="assigned_user_id" defaultValue={task.assignedUserId} className={inputClass}><option value="">إبقاء المسؤول الحالي أو الإسناد للدور</option>{people.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select>
        <div className="grid gap-2 sm:grid-cols-3"><select name="priority" defaultValue={task.priority} className={inputClass}>{Object.entries(taskPriorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select name="status" defaultValue={task.status} className={inputClass}>{Object.entries(taskStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input type="date" name="due_date" defaultValue={task.dueDate} className={inputClass} /></div>
        <input name="linked_url" defaultValue={task.linkedUrl} dir="ltr" className={inputClass} />
        <input name="admin_note" defaultValue={task.adminNote} className={inputClass} placeholder="ملاحظة الإدارة" />
        <button className="primary-button min-h-11 rounded-xl px-4 text-sm font-semibold">حفظ التعديل</button>
      </form>
      <form action={archiveTaskAction} className="mt-2"><input type="hidden" name="task_id" value={task.id} /><button className="min-h-10 rounded-xl border border-red-200 px-4 text-xs font-semibold text-red-700">أرشفة المهمة</button></form>
    </details>
  );
}

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--text)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-emerald-100";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-semibold text-[var(--primary-dark)]">{label}{children}</label>; }
function formatDate(value: string) { return value ? new Intl.DateTimeFormat("ar-SA").format(new Date(value)) : "غير محدد"; }
