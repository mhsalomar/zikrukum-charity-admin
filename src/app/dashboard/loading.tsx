export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* PageHero skeleton */}
      <section className="app-card rounded-[1.8rem] p-6">
        <div className="h-3 w-48 skeleton rounded-xl" />
        <div className="mt-3 h-8 w-72 skeleton rounded-2xl" />
        <div className="mt-3 h-4 w-full max-w-xl skeleton rounded-xl" />
        <div className="mt-8 h-20 w-64 skeleton rounded-2xl" />
      </section>

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="stat-card h-28 skeleton rounded-[1.5rem]" />
        ))}
      </section>

      {/* Quick action buttons */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 skeleton rounded-[1.4rem]" />
        ))}
      </section>

      {/* Charts section */}
      <section className="app-card rounded-[1.6rem] p-5">
        <div className="h-5 w-36 skeleton rounded-xl" />
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="h-40 skeleton rounded-2xl" />
          <div className="h-40 skeleton rounded-2xl" />
          <div className="h-40 skeleton rounded-2xl xl:col-span-2" />
        </div>
      </section>

      {/* Monthly bar chart */}
      <div className="h-52 skeleton rounded-[1.6rem]" />

      {/* Activity panel */}
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="app-card h-64 skeleton rounded-[1.6rem]" />
        <div className="app-card h-64 skeleton rounded-[1.6rem]" />
      </section>
    </div>
  );
}
