"use client";

const services = [
  {
    icon: "DI",
    title: "Dine-In Experience",
    description:
      "Comfortable seating, warm service, and a full menu crafted for memorable meals.",
  },
  {
    icon: "DL",
    title: "Fast Delivery",
    description:
      "Hot, fresh food delivered to your door with live order tracking.",
  },
  {
    icon: "PU",
    title: "Quick Pickup",
    description: "Order ahead from web and collect your meal right on time.",
  },
  {
    icon: "CT",
    title: "Event Catering",
    description:
      "Custom catering menus for office lunches, parties, and family celebrations.",
  },
  {
    icon: "CS",
    title: "Chef Specials",
    description:
      "Seasonal dishes and limited-time recipes prepared by our kitchen team.",
  },
  {
    icon: "FM",
    title: "Family Combos",
    description:
      "Value meal bundles designed for group dining and weekend feasts.",
  },
];

const portfolio = [
  {
    title: "Signature Grill Platter",
    description:
      "Mixed grilled chicken, lamb, and vegetables with house sauces and fresh bread.",
    tags: ["Popular", "High Protein", "Chef Pick"],
    visualClass: "gt-visual-1",
  },
  {
    title: "Classic Burger Meal",
    description:
      "Juicy beef patty, cheddar, caramelized onion, and fries with dip.",
    tags: ["Fast Food", "Customer Favorite"],
    visualClass: "gt-visual-2",
  },
  {
    title: "Wood-Fired Pizza",
    description:
      "Stone-baked crust topped with mozzarella, basil, and rich tomato sauce.",
    tags: ["Italian", "Best Seller"],
    visualClass: "gt-visual-3",
  },
  {
    title: "Fresh Garden Bowl",
    description:
      "Crisp greens, roasted veggies, avocado, and lemon-herb dressing.",
    tags: ["Healthy", "Vegan Option"],
    visualClass: "gt-visual-4",
  },
  {
    title: "Creamy Pasta Alfredo",
    description:
      "Fresh pasta in parmesan cream sauce with mushroom and garlic notes.",
    tags: ["Comfort Food", "Dinner"],
    visualClass: "gt-visual-5",
  },
  {
    title: "Dessert Collection",
    description:
      "Brownie, cheesecake, and seasonal sweets made in-house daily.",
    tags: ["Sweet", "Weekend Special"],
    visualClass: "gt-visual-6",
  },
];

const testimonials = [
  {
    id: "review-1",
    quote:
      "The food was incredible and the service felt genuinely personal. We keep coming back.",
    name: "Sarim",
    role: "Regular Guest",
    initial: "S",
  },
  {
    id: "review-2",
    quote:
      "Delivery was fast, everything arrived hot, and the taste was exactly what we wanted.",
    name: "Sarim",
    role: "Delivery Customer",
    initial: "S",
  },
  {
    id: "review-3",
    quote:
      "We booked catering for a team event and every dish was fresh and perfectly prepared.",
    name: "Sarim",
    role: "Corporate Client",
    initial: "S",
  },
  {
    id: "review-4",
    quote:
      "The flavors are always consistent and the portions are perfect for family dinner nights.",
    name: "Sarim",
    role: "Family Guest",
    initial: "S",
  },
  {
    id: "review-5",
    quote:
      "Pickup was smooth and fast, and the meal was still fresh when I reached home.",
    name: "Sarim",
    role: "Pickup Customer",
    initial: "S",
  },
  {
    id: "review-6",
    quote:
      "Their chef specials are creative and delicious. I always try the new weekly item.",
    name: "Sarim",
    role: "Weekend Guest",
    initial: "S",
  },
];

export default function Home() {
  return (
    <main className="gt-site">
      <section className="gt-hero gt-section-alt">
        <div className="shell">
          <div className="gt-hero-inner">
            <span className="gt-pill">Restaurant</span>
            <h1 className="mt-5 text-balance text-5xl font-black tracking-tight text-[#1c1c1c] sm:text-6xl lg:text-7xl">
              Tikanmaan Kebab Pizeeria
            </h1>
            <p className="mt-5 text-lg sm:text-2xl">
              Fresh kebab, pizzas, and fast delivery every day.
            </p>
          </div>
        </div>
      </section>

      <section id="services" className="gt-section">
        <div className="shell">
          <div className="gt-section-head">
            <span className="gt-pill">Our Services</span>
            <h2>What We Offer</h2>
            <p>Flexible dining options for every mood, plan, and occasion.</p>
          </div>
          <div className="gt-grid gt-grid-3">
            {services.map((item) => (
              <article key={item.title} className="gt-card">
                <p className="gt-service-icon">{item.icon}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="menu" className="gt-section gt-section-alt">
        <div className="shell">
          <div className="gt-section-head">
            <span className="gt-pill">Featured Menu</span>
            <h2>Chef Recommended Dishes</h2>
            <p>A selection of guest favorites from our kitchen.</p>
          </div>
          <div className="gt-grid gt-grid-3">
            {portfolio.map((item) => (
              <article key={item.title} className="gt-card gt-product-card">
                <div className={`gt-visual ${item.visualClass}`} />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="gt-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="gt-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gt-section">
        <div className="shell">
          <div className="gt-section-head">
            <span className="gt-pill">Testimonials</span>
            <h2>What Our Guests Say</h2>
            <p>We take pride in every meal and every customer experience.</p>
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

      <section id="about" className="gt-section gt-section-alt">
        <div className="shell gt-story">
          <article>
            <span className="gt-pill gt-pill-wide">Our Story</span>
            <h2>A Tradition of Great Food</h2>
            <p>
              Founded in 1995, FoodApp started as a small family-owned
              restaurant focused on authentic taste and warm hospitality. Over
              the years, we have expanded into a full dining and delivery
              experience while keeping our quality standards high.
            </p>
            <p>
              Today, our chefs and service team prepare every order with fresh
              ingredients and consistent care so every guest enjoys a meal worth
              remembering.
            </p>
          </article>
          <div className="gt-story-image" />
        </div>
      </section>

    </main>
  );
}
