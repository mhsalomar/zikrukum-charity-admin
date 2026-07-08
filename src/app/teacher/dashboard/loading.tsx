export default function TeacherDashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="h-40 skeleton rounded-[1.8rem]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 skeleton rounded-[1.45rem]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="h-52 skeleton rounded-[1.6rem]" />
        <div className="h-52 skeleton rounded-[1.6rem]" />
      </div>
    </main>
  );
}
