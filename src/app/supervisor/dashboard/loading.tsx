export default function SupervisorDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-40 skeleton rounded-[1.8rem]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 skeleton rounded-[1.4rem]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="h-64 skeleton rounded-[1.6rem]" />
        <div className="h-64 skeleton rounded-[1.6rem]" />
      </div>
    </div>
  );
}
