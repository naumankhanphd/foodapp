export default function StaffReportsPage() {
  return (
    <section className="panel p-4 sm:p-6">
      <h2 className="text-2xl">Reports</h2>
      <p className="mt-2 text-sm">
        Sales and popular-item reports will render here with date-range filters.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-[var(--line)] bg-white p-4">
          <p className="text-xs uppercase tracking-wide">Sales Today</p>
          <p className="mt-2 text-xl font-semibold">$1,482.90</p>
        </article>
        <article className="rounded-xl border border-[var(--line)] bg-white p-4">
          <p className="text-xs uppercase tracking-wide">Top Item</p>
          <p className="mt-2 text-xl font-semibold">Charred Chicken Bowl</p>
        </article>
      </div>
    </section>
  );
}

