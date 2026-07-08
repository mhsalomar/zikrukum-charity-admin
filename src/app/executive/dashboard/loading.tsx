export default function ExecutiveDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-40 skeleton rounded-[1.8rem]" />
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="h-80 skeleton rounded-[1.6rem]" />
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-[1.45rem]" />
            ))}
          </div>
          <div className="h-64 skeleton rounded-[1.6rem]" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-48 skeleton rounded-[1.6rem]" />
            <div className="h-48 skeleton rounded-[1.6rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
