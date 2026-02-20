function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-md bg-[var(--line)]/70 ${className}`} />;
}

export default function MenuItemLoading() {
  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid animate-pulse gap-5">
        <header className="panel p-5 sm:p-7">
          <SkeletonLine className="h-5 w-24 rounded-full" />
          <SkeletonLine className="mt-4 h-10 w-72" />
          <SkeletonLine className="mt-3 h-4 w-11/12" />
          <SkeletonLine className="mt-2 h-4 w-7/12" />
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <article className="panel p-4 sm:p-6">
            <SkeletonLine className="h-7 w-24" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SkeletonLine className="aspect-video w-full rounded-lg" />
              <SkeletonLine className="aspect-video w-full rounded-lg" />
            </div>
            <SkeletonLine className="mt-5 h-4 w-56" />
            <SkeletonLine className="mt-2 h-4 w-44" />
            <SkeletonLine className="mt-2 h-4 w-40" />
          </article>

          <aside className="panel p-4 sm:p-6">
            <SkeletonLine className="h-7 w-32" />
            <SkeletonLine className="mt-3 h-10 w-full" />
            <SkeletonLine className="mt-3 h-24 w-full" />
            <SkeletonLine className="mt-4 h-10 w-36 rounded-lg" />
            <SkeletonLine className="mt-6 h-7 w-40" />
            <SkeletonLine className="mt-3 h-20 w-full rounded-lg" />
            <SkeletonLine className="mt-4 h-10 w-28 rounded-lg" />
          </aside>
        </section>
      </div>
    </main>
  );
}
