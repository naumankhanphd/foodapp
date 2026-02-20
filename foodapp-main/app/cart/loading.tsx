function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-md bg-[var(--line)]/70 ${className}`} />;
}

export default function CartLoading() {
  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid animate-pulse gap-5">
        <header className="panel p-5 sm:p-7">
          <SkeletonLine className="h-5 w-24 rounded-full" />
          <SkeletonLine className="mt-4 h-10 w-44" />
          <SkeletonLine className="mt-3 h-4 w-2/3" />
        </header>

        <section className="panel p-4 sm:p-6">
          <SkeletonLine className="h-7 w-24" />
          <div className="mt-4 grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={index} className="rounded-xl border border-[var(--line)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <SkeletonLine className="h-6 w-48" />
                  <SkeletonLine className="h-5 w-16" />
                </div>
                <SkeletonLine className="mt-4 h-10 w-full" />
                <SkeletonLine className="mt-3 h-20 w-full" />
                <div className="mt-3 flex gap-2">
                  <SkeletonLine className="h-10 w-28 rounded-lg" />
                  <SkeletonLine className="h-10 w-24 rounded-lg" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
