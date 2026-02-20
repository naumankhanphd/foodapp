const offers = [
  {
    name: "Weekday Lunch",
    detail: "10% off for dine-in orders above $20.",
    scope: "Dine-in only",
  },
  {
    name: "Evening Delivery",
    detail: "Free delivery from 6:00 PM to 9:00 PM.",
    scope: "Delivery only",
  },
];

export default function OffersPage() {
  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid gap-5">
        <header className="panel p-5 sm:p-7">
          <p className="badge">Customer</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Offers</h1>
          <p className="mt-2 text-sm sm:text-base">
            Discount and free-delivery campaigns can be managed from the admin dashboard.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          {offers.map((offer) => (
            <article key={offer.name} className="panel p-5">
              <h2 className="text-xl">{offer.name}</h2>
              <p className="mt-2 text-sm">{offer.detail}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide">{offer.scope}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
