function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-md bg-[var(--line)]/70 ${className}`} />;
}

export default function GlobalLoading() {
  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid animate-pulse gap-5">
        <section className="panel p-5 sm:p-7">
          <SkeletonLine className="h-5 w-24 rounded-full" />
          <SkeletonLine className="mt-4 h-10 w-56 sm:w-72" />
          <SkeletonLine className="mt-3 h-4 w-full max-w-2xl" />
          <SkeletonLine className="mt-2 h-4 w-3/4 max-w-xl" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="panel p-4 sm:p-5">
              <SkeletonLine className="h-6 w-2/3" />
              <SkeletonLine className="mt-4 aspect-[4/3] w-full" />
              <SkeletonLine className="mt-4 h-4 w-full" />
              <SkeletonLine className="mt-2 h-4 w-5/6" />
              <SkeletonLine className="mt-6 h-10 w-36 rounded-full" />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
