type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

const timeline = ["Accepted", "Preparing", "Out for delivery", "Delivered"];

export default async function OrderTrackingPage({ params }: OrderPageProps) {
  const { orderId } = await params;

  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid gap-5">
        <header className="panel p-5 sm:p-7">
          <p className="badge">Tracking</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Order {orderId}</h1>
          <p className="mt-2 text-sm sm:text-base">
            Realtime updates will stream here through SSE with polling fallback.
          </p>
        </header>

        <section className="panel p-5 sm:p-7">
          <h2 className="text-xl">Status Timeline</h2>
          <ol className="mt-4 grid gap-3">
            {timeline.map((step, index) => (
              <li
                key={step}
                className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
              >
                <span className="mr-2 font-semibold">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm">Estimated arrival: 24 minutes</p>
        </section>
      </div>
    </main>
  );
}

