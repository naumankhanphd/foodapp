function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-md bg-[var(--line)]/70 ${className}`} />;
}

export default function CheckoutLoading() {
  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid animate-pulse gap-5">
        <header className="panel p-5 sm:p-7">
          <SkeletonLine className="h-5 w-24 rounded-full" />
          <SkeletonLine className="mt-4 h-10 w-52" />
          <SkeletonLine className="mt-3 h-4 w-3/4" />
        </header>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <article className="panel p-4 sm:p-6">
            <SkeletonLine className="h-7 w-32" />
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <SkeletonLine className="h-11 w-full rounded-lg" />
              <SkeletonLine className="h-11 w-full rounded-lg" />
              <SkeletonLine className="h-11 w-full rounded-lg" />
            </div>
            <SkeletonLine className="mt-6 h-6 w-40" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <SkeletonLine className="h-11 w-full rounded-lg" />
              <SkeletonLine className="h-11 w-full rounded-lg" />
              <SkeletonLine className="h-11 w-full rounded-lg" />
              <SkeletonLine className="h-11 w-full rounded-lg" />
            </div>
            <SkeletonLine className="mt-6 h-10 w-40 rounded-lg" />
          </article>

          <aside className="panel p-4 sm:p-6">
            <SkeletonLine className="h-7 w-24" />
            <SkeletonLine className="mt-4 h-4 w-full" />
            <SkeletonLine className="mt-2 h-4 w-full" />
            <SkeletonLine className="mt-2 h-4 w-full" />
            <SkeletonLine className="mt-2 h-4 w-full" />
            <SkeletonLine className="mt-5 h-12 w-full rounded-xl" />
          </aside>
        </section>
      </div>
    </main>
  );
}
