"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
            <h3>Tikanmaan Pizzeria</h3>
            <p>Fresh meals, fast delivery, and cozy dine-in experiences.</p>
            <Link className="gt-footer-link" href="/menu">
              Browse full menu
            </Link>
          </article>
          <article>
            <h4>Services</h4>
            <ul>
              <li>Dine-In</li>
              <li>Delivery</li>
              <li>Pickup</li>
            </ul>
          </article>
          <article>
            <h4>Info</h4>
            <ul>
              <li>About Us</li>
              <li>Contact</li>
              <li>Allergen Info</li>
            </ul>
          </article>
        </div>
      </div>
    </footer>
  );
}
