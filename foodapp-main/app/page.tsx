"use client";

import Link from "next/link";

const services = [
  {
    icon: "🍽️",
    title: "Dine-In",
    description:
      "Sit back and enjoy warm service, a full menu, and a comfortable dining atmosphere made for great meals.",
  },
  {
    icon: "🛵",
    title: "Fast Delivery",
    description:
      "Hot food to your door, trackable from the moment it leaves our kitchen to the moment it arrives.",
  },
  {
    icon: "🥡",
    title: "Quick Pickup",
    description:
      "Order ahead from your phone or browser and collect your meal at the counter — no waiting.",
  },
  {
    icon: "🎉",
    title: "Event Catering",
    description:
      "Custom menus for office lunches, birthday parties, and family celebrations. We handle the food.",
  },
  {
    icon: "👨‍🍳",
    title: "Chef Specials",
    description:
      "Seasonal dishes and limited-time recipes crafted fresh by our kitchen team every week.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Family Combos",
    description:
      "Value bundles and sharing platters built for group dining, weekends, and big appetites.",
  },
];

const featured = [
  {
    title: "Kebab Platter",
    description:
      "Tender marinated chicken or lamb kebab served with rice, fresh salad, and our signature garlic sauce.",
    tags: ["Best Seller", "High Protein", "Chef Pick"],
    bg: "bg-[#fff2e8]",
    border: "border-[#e8863a]",
  },
  {
    title: "Wood-Fired Pizza",
    description:
      "Stone-baked crust loaded with mozzarella, fresh toppings, and rich tomato sauce — crisp every time.",
    tags: ["Italian Style", "Popular"],
    bg: "bg-[#f7f2ff]",
    border: "border-[#7c5bb8]",
  },
  {
    title: "Kebab Box",
    description:
      "Generous portions of kebab meat, fries, and bread in one box. Perfect for a quick satisfying meal.",
    tags: ["Fast Food", "Value"],
    bg: "bg-[#eaf8ff]",
    border: "border-[#2ea7d3]",
  },
  {
    title: "Veggie Pizza",
    description:
      "Seasonal vegetables, olives, and fresh herbs on a golden crust. Light, flavourful, and filling.",
    tags: ["Vegetarian", "Healthy"],
    bg: "bg-[#eef7ef]",
    border: "border-[#2f9b52]",
  },
  {
    title: "Mixed Grill",
    description:
      "A full spread of grilled meats, dips, and sides — the crowd-pleaser for hungry groups.",
    tags: ["Sharing", "Weekend Special"],
    bg: "bg-[#fff7e8]",
    border: "border-[#f7b731]",
  },
  {
    title: "Today's Special",
    description:
      "Our kitchen team prepares a fresh dish every day. Check the menu for what's on today.",
    tags: ["Daily Special", "Fresh"],
    bg: "bg-[#eef3ff]",
    border: "border-[#3b6ff0]",
  },
];

const stats = [
  { value: "30+", label: "Years Serving" },
  { value: "500+", label: "Orders a Day" },
  { value: "4.8★", label: "Customer Rating" },
  { value: "3", label: "Ways to Order" },
];

const testimonials = [
  {
    id: "r1",
    quote: "The kebab is genuinely the best in town. We order every Friday without fail.",
    name: "Mikael H.",
    role: "Regular Guest",
    initial: "M",
  },
  {
    id: "r2",
    quote: "Delivery was at the door in 25 minutes and everything was still piping hot.",
    name: "Laura P.",
    role: "Delivery Customer",
    initial: "L",
  },
  {
    id: "r3",
    quote: "We catered our whole office event through Tikanmaan. Every dish was fresh and perfect.",
    name: "Riku V.",
    role: "Corporate Client",
    initial: "R",
  },
  {
    id: "r4",
    quote: "The pizza crust is crispy and the toppings are always generous. Kids love it too.",
    name: "Hanna K.",
    role: "Family Guest",
    initial: "H",
  },
  {
    id: "r5",
    quote: "Pickup is super easy — order online, walk in, grab your bag. Exactly what I need.",
    name: "Tomas E.",
    role: "Pickup Customer",
    initial: "T",
  },
  {
    id: "r6",
    quote: "Chef specials are always creative. I check the menu every week just to see what's new.",
    name: "Aino S.",
    role: "Weekend Guest",
    initial: "A",
  },
];

export default function Home() {
  return (
    <main className="gt-site">

      {/* ── Hero ── */}
      <section className="gt-hero gt-section-alt">
        <div className="shell">
          <div className="gt-hero-inner">
            <span className="gt-pill">Kebab &amp; Pizza · Est. 1995</span>
            <h1 className="mt-5 text-balance text-5xl font-black tracking-tight text-[#1c1c1c] sm:text-6xl lg:text-7xl">
              Tikanmaan<br className="hidden sm:block" /> Kebab Pizzeria
            </h1>
            <p className="mt-5 text-lg sm:text-2xl">
              Authentic kebabs, wood-fired pizzas, and fast delivery — prepared fresh every day in our kitchen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="rounded-xl border-[3px] border-[#2d1d13] bg-[#f97316] px-6 py-3 text-base font-black text-white shadow-[4px_4px_0_0_#2d1d13] transition hover:bg-[#ea6c0a] active:translate-y-0.5"
              >
                View Full Menu
              </Link>
              <Link
                href="/menu"
                className="rounded-xl border-[3px] border-[#2d1d13] bg-white px-6 py-3 text-base font-black text-[#2d1d13] shadow-[4px_4px_0_0_#2d1d13] transition hover:bg-[#fff4dd] active:translate-y-0.5"
              >
                Order Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="gt-section">
        <div className="shell">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <article
                key={s.label}
                className="rounded-[20px] border-[3px] border-[#2d1d13] bg-[#fff4dd] px-5 py-4 text-center shadow-[4px_4px_0_0_#2d1d13]"
              >
                <p className="text-3xl font-black text-[#2d1d13]">{s.value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[#6a4b30]">{s.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="gt-section gt-section-alt">
        <div className="shell">
          <div className="gt-section-head">
            <span className="gt-pill">Our Services</span>
            <h2>How We Serve You</h2>
            <p>Three ways to enjoy Tikanmaan — dine in, pick up, or get it delivered.</p>
          </div>
          <div className="gt-grid gt-grid-3">
            {services.map((item) => (
              <article key={item.title} className="gt-card">
                <p className="text-3xl">{item.icon}</p>
                <h3 className="mt-3">{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured dishes ── */}
      <section id="menu" className="gt-section">
        <div className="shell">
          <div className="gt-section-head">
            <span className="gt-pill">Featured Menu</span>
            <h2>What We're Known For</h2>
            <p>From our signature kebabs to crispy pizzas — made fresh to order, every time.</p>
          </div>
          <div className="gt-grid gt-grid-3">
            {featured.map((item) => (
              <article
                key={item.title}
                className={`gt-card rounded-[20px] border-[3px] border-[#2d1d13] ${item.bg} p-5 shadow-[4px_4px_0_0_#2d1d13]`}
              >
                <div className={`mb-3 h-1.5 w-10 rounded-full ${item.border.replace("border-", "bg-")}`} />
                <h3 className="text-lg font-black text-[#1f1f1f]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#4a3728]">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${item.border} text-[#2d1d13]`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/menu"
              className="inline-block rounded-xl border-[3px] border-[#2d1d13] bg-[#f97316] px-8 py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#2d1d13] transition hover:bg-[#ea6c0a]"
            >
              See Full Menu
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="gt-section gt-section-alt">
        <div className="shell">
          <div className="gt-section-head">
            <span className="gt-pill">Testimonials</span>
            <h2>What Our Guests Say</h2>
            <p>Real feedback from the people who eat with us every week.</p>
          </div>
          <div className="gt-testimonials-marquee">
            <div className="gt-testimonials-track">
              {[0, 1].map((groupIndex) => (
                <div
                  key={`review-group-${groupIndex}`}
                  className="gt-testimonials-group"
                  aria-hidden={groupIndex === 1}
                >
                  {testimonials.map((item) => (
                    <article
                      key={`${groupIndex}-${item.id}`}
                      className="gt-card gt-testimonial gt-testimonial-card"
                    >
                      <p className="gt-quote">{item.quote}</p>
                      <div className="gt-user">
                        <span>{item.initial}</span>
                        <div>
                          <h3>{item.name}</h3>
                          <p>{item.role}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="gt-section">
        <div className="shell gt-story">
          <article>
            <span className="gt-pill gt-pill-wide">Our Story</span>
            <h2>Thirty Years of Real Food</h2>
            <p>
              Tikanmaan Kebab Pizzeria opened its doors in 1995 with one goal — serve honest,
              flavourful food made from fresh ingredients every single day. What started as a small
              kebab counter has grown into a full kitchen offering dine-in, delivery, and pickup.
            </p>
            <p>
              Our recipes haven't changed much. We still marinate in-house, bake our own dough, and
              prepare every order the same way we did on day one — by hand, with care.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="rounded-xl border-[3px] border-[#2d1d13] bg-[#f97316] px-5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_0_#2d1d13] transition hover:bg-[#ea6c0a]"
              >
                Browse the Menu
              </Link>
            </div>
          </article>
          <div className="gt-story-image" />
        </div>
      </section>

    </main>
  );
}
