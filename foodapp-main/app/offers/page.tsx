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
        <header className="rounded-[20px] border-[3px] border-[#2d1d13] bg-[linear-gradient(155deg,#fff4dd_0%,#f9ecd4_58%,#e7f6ef_100%)] p-5 shadow-[6px_6px_0_0_#2d1d13] sm:p-7">
          <p className="badge">Customer</p>
          <h1 className="mt-3 text-3xl font-black text-[#1f1f1f] sm:text-4xl">Offers</h1>
          <p className="mt-2 text-sm text-[#5f4a38] sm:text-base">
            Discount and free-delivery campaigns can be managed from the admin dashboard.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {offers.map((offer) => (
            <article
              key={offer.name}
              className="rounded-[18px] border-[3px] border-[#2d1d13] bg-[#edf5ef] p-5 shadow-[4px_4px_0_0_#2d1d13]"
            >
              <h2 className="text-2xl font-black leading-tight text-[#1f1f1f]">{offer.name}</h2>
              <p className="mt-2 text-sm text-[#5f4a38]">{offer.detail}</p>
              <p className="mt-3 inline-flex rounded-full border border-[#2d1d13] bg-[#fff8eb] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4f3f2e]">
                {offer.scope}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
