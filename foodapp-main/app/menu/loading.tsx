function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-md bg-[var(--line)]/70 ${className}`} />;
}

export default function MenuLoading() {
  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid animate-pulse gap-4">
        <div className="sticky top-20 z-30 rounded-2xl border border-[var(--line)] bg-white p-2">
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonLine key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>

        <section className="grid gap-4 pt-4 sm:pt-6">
          <SkeletonLine className="h-12 w-64 sm:h-14 sm:w-80" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="rounded-[20px] border-[3px] border-[#2d1d13] bg-[#e8efea] p-4">
                <div className="flex items-start justify-between gap-3">
                  <SkeletonLine className="h-8 w-2/3" />
                  <div className="grid gap-2">
                    <SkeletonLine className="h-4 w-16" />
                    <SkeletonLine className="h-4 w-20" />
                  </div>
                </div>
                <SkeletonLine className="mt-4 aspect-[4/3] w-full rounded-xl border-2 border-[#2d1d13]" />
                <SkeletonLine className="mt-4 h-5 w-full" />
                <SkeletonLine className="mt-2 h-5 w-5/6" />
                <div className="mt-6 flex items-center justify-between">
                  <SkeletonLine className="h-8 w-20 rounded-full" />
                  <SkeletonLine className="h-10 w-24 rounded-full" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
