"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { key: "home", href: "/", label: "Home" },
  { key: "menu", href: "/menu", label: "Menu" },
  { key: "cart", href: "/cart", label: "Cart" },
  { key: "offers", href: "/offers", label: "Offers" },
];

type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "CUSTOMER" | "ADMIN";
};

export function SiteHero() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const payload = (await response.json()) as { user?: SessionUser };
        if (!cancelled) {
          setUser(payload.user || null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    if (logoutPending) {
      return;
    }

    setLogoutPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setLogoutPending(false);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="gt-header">
      <div className="gt-header-shell">
        <div className="gt-topbar">
          <Link className="gt-brand" href="/">
            FoodApp
          </Link>
          <nav className="gt-nav hidden md:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={pathname === item.href ? "is-active" : undefined}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="gt-header-right">
            <div className="gt-auth-actions hidden md:flex">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">
                    <p className="font-semibold">{user.fullName || user.email}</p>
                    <p className="text-xs text-[var(--muted)]">{user.role}</p>
                  </div>
                  {user.role === "ADMIN" ? (
                    <Link className="gt-btn gt-btn-outline" href="/staff">
                      Dashboard
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="gt-btn gt-btn-primary"
                    onClick={() => void handleLogout()}
                    disabled={logoutPending}
                  >
                    {logoutPending ? "..." : "Logout"}
                  </button>
                </div>
              ) : user === null ? (
                <>
                  <Link className="gt-btn gt-btn-outline" href="/auth/login">
                    Login
                  </Link>
                  <Link className="gt-btn gt-btn-primary" href="/auth/signup">
                    Register
                  </Link>
                </>
              ) : null}
            </div>
            <details className="gt-mobile-nav md:hidden">
              <summary>Menu</summary>
              <div className="gt-mobile-menu">
                {navItems.map((item) => (
                  <Link
                    key={`mobile-${item.key}`}
                    href={item.href}
                    className={pathname === item.href ? "is-active" : undefined}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="gt-mobile-actions">
                  {user ? (
                    <>
                      <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs">
                        <p className="font-semibold">{user.fullName || user.email}</p>
                        <p className="text-[var(--muted)]">{user.role}</p>
                      </div>
                      {user.role === "ADMIN" ? (
                        <Link className="gt-btn gt-btn-outline justify-center" href="/staff">
                          Dashboard
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="gt-btn gt-btn-primary justify-center"
                        onClick={() => void handleLogout()}
                        disabled={logoutPending}
                      >
                        {logoutPending ? "..." : "Logout"}
                      </button>
                    </>
                  ) : user === null ? (
                    <>
                      <Link className="gt-btn gt-btn-outline justify-center" href="/auth/login">
                        Login
                      </Link>
                      <Link className="gt-btn gt-btn-primary justify-center" href="/auth/signup">
                        Register
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
