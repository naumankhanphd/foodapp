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
        <section className="grid gap-4 sm:grid-cols-2">
          {offers.map((offer) => (
            <article
              key={offer.name}
              className="relative bg-[#1c2b1c] p-5"
              style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.12), 4px 4px 0 0 #0d160d" }}
            >
              {/* Scope label + chalk rule */}
              <div className="mb-3 text-center">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/40">
                  {offer.scope}
                </span>
                <div className="mt-1.5 h-px bg-white/15" />
              </div>
              {/* Chalk title */}
              <h2
                className="text-center text-xl font-black leading-tight text-white/90"
                style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', cursive", textShadow: "1px 1px 0 rgba(255,255,255,0.1)" }}
              >
                {offer.name}
              </h2>
              {/* Detail */}
              <p className="mt-2.5 text-center text-sm italic text-white/50">{offer.detail}</p>
              <div className="mt-4 h-px bg-white/15" />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
