function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-md bg-[var(--line)]/70 ${className}`} />;
}

export default function OffersLoading() {
  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid animate-pulse gap-5">
        <header className="panel p-5 sm:p-7">
          <SkeletonLine className="h-5 w-24 rounded-full" />
          <SkeletonLine className="mt-4 h-10 w-44" />
          <SkeletonLine className="mt-3 h-4 w-2/3" />
        </header>
        <section className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="panel p-5">
              <SkeletonLine className="h-7 w-2/3" />
              <SkeletonLine className="mt-3 h-4 w-full" />
              <SkeletonLine className="mt-2 h-4 w-5/6" />
              <SkeletonLine className="mt-4 h-4 w-1/2" />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
