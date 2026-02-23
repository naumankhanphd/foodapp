"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerServices = ["Dine-In", "Delivery", "Pickup", "Catering", "Chef Specials"];
const footerCompany = ["About Us", "Our Chefs", "Careers", "Blog", "Contact"];
const footerLegal = ["Privacy Policy", "Terms of Service", "Allergen Info"];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/auth/complete-profile")) {
    return null;
  }

  return (
    <footer className="gt-footer">
      <div className="shell">
        <div className="gt-footer-top">
          <article>
            <h3>FoodApp</h3>
            <p>Fresh meals, fast delivery, and cozy dine-in experiences every day.</p>
            <Link className="gt-footer-link" href="/menu">
              Browse full menu
            </Link>
          </article>
          <article>
            <h4>Services</h4>
            <ul>
              {footerServices.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h4>Company</h4>
            <ul>
              {footerCompany.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h4>Legal</h4>
            <ul>
              {footerLegal.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </footer>
  );
}
