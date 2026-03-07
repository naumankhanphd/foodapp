function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-md bg-[var(--line)]/70 ${className}`} />;
}

export default function MenuLoading() {
  return (
    <main className="pt-0 pb-6 sm:pb-10">
      <div className="shell grid animate-pulse gap-0">
        <div className="sticky top-[68px] z-30 -mt-5 mx-1.5 mb-3 rounded-b-2xl border-x-[3px] border-b-[3px] border-[#2d1d13] bg-[rgb(52_43_79_/_0.96)] px-2 py-2 backdrop-blur sm:-mx-2 sm:-mt-4 sm:mb-4">
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonLine key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>

        <section className="grid gap-4 pt-0">
          <SkeletonLine className="h-12 w-64 sm:h-14 sm:w-80" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="relative mx-auto w-full max-w-[200px]">
                <div className="absolute inset-0 bg-emerald-300" style={{ transform: "translateX(8px) translateY(6px) rotate(4deg)" }} />
                <div className="absolute inset-0 bg-emerald-100" style={{ transform: "translateX(4px) translateY(3px) rotate(2deg)" }} />
                <article className="relative bg-white p-3 pb-8" style={{ boxShadow: "4px 4px 0 0 #047857" }}>
                  <div className="h-40 w-full border-2 border-black">
                    <SkeletonLine className="h-full w-full" />
                  </div>
                  <div className="pt-3 text-center">
                    <SkeletonLine className="mx-auto h-5 w-3/4" />
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <SkeletonLine className="h-4 w-16" />
                      <SkeletonLine className="h-7 w-12" />
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
