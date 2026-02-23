import Link from "next/link";

type StaffLayoutProps = {
  children: React.ReactNode;
};

export default function StaffLayout({ children }: StaffLayoutProps) {
  return (
    <main className="py-6 sm:py-8">
      <div className="shell grid gap-4">
        <header className="panel p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="badge">Admin</p>
              <h1 className="mt-2 text-2xl sm:text-3xl">Operations Dashboard</h1>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link className="rounded-lg border border-[var(--line)] bg-white px-3 py-2" href="/staff">
                Overview
              </Link>
              <Link
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                href="/staff/orders"
              >
                Queue
              </Link>
              <Link
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                href="/staff/offers"
              >
                Offers
              </Link>
              <Link
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                href="/staff/payments"
              >
                Payments
              </Link>
              <Link
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                href="/staff/reports"
              >
                Reports
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
