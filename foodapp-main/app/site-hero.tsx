"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleAuthButton } from "@/components/google-auth-button";

const navItems = [
  { key: "home", href: "/", label: "Home" },
  { key: "menu", href: "/menu", label: "Menu" },
  { key: "cart", href: "/cart", label: "Cart" },
  { key: "offers", href: "/offers", label: "Offers" },
];
const neutralNavItems = navItems.filter((item) => item.key !== "home" && item.key !== "cart");

type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "CUSTOMER" | "ADMIN";
};

type AuthView = "login" | "signup";

type AuthPayload = {
  user?: SessionUser;
  message?: string;
  requiresCompletion?: boolean;
  pendingToken?: string;
};

export function SiteHero() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [logoutPending, setLogoutPending] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const postAuthPath = useMemo(() => {
    if (!pathname || pathname.startsWith("/auth") || pathname.startsWith("/staff")) {
      return "/menu";
    }
    return pathname;
  }, [pathname]);

  const visibleNavItems = useMemo(() => {
    if (user === undefined) {
      return neutralNavItems;
    }

    if (user?.role !== "ADMIN") {
      return navItems;
    }
    return [
      { key: "dashboard", href: "/staff", label: "Dashboard" },
      ...neutralNavItems,
    ];
  }, [user]);

  const accountDisplayName = (user?.fullName || user?.email || "").trim();
  const accountInitial = (accountDisplayName.charAt(0) || "U").toUpperCase();
  const accountTriggerLabel = user?.role === "ADMIN" ? "Admin" : "Account";

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  useEffect(() => {
    if (!authView) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !authPending) {
        setAuthView(null);
        setAuthError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [authView, authPending]);

  function openAuthModal(view: AuthView) {
    if (authPending) {
      return;
    }

    if (view === "signup" && !signupEmail && loginEmail) {
      setSignupEmail(loginEmail);
    }
    if (view === "login" && !loginEmail && signupEmail) {
      setLoginEmail(signupEmail);
    }

    setMobileMenuOpen(false);
    setAuthError("");
    setAuthView(view);
  }

  function closeAuthModal() {
    if (authPending) {
      return;
    }

    setAuthView(null);
    setAuthError("");
  }

  function completeAuthSuccess(userFromApi?: SessionUser) {
    setAuthView(null);
    setAuthError("");
    if (userFromApi) {
      setUser(userFromApi);
    }
    router.push(postAuthPath);
    router.refresh();
  }

  function completeProfileFlow(pendingToken?: string) {
    setAuthView(null);
    setAuthError("");
    const nextParam = encodeURIComponent(postAuthPath);
    if (pendingToken) {
      router.push(`/auth/complete-profile?pending=${encodeURIComponent(pendingToken)}&next=${nextParam}`);
      return;
    }
    router.push(`/auth/complete-profile?next=${nextParam}`);
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthPending(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
          requiredRole: "CUSTOMER",
        }),
      });
      const payload = (await response.json()) as AuthPayload;

      if (!response.ok) {
        setAuthError(payload.message || "Request failed.");
        return;
      }

      if (payload.requiresCompletion) {
        completeProfileFlow(payload.pendingToken);
        return;
      }

      completeAuthSuccess(payload.user);
    } catch {
      setAuthError("Unable to reach authentication service.");
    } finally {
      setAuthPending(false);
    }
  }

  async function handleGoogleLogin() {
    setAuthPending(true);
    setAuthError("");

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        setAuthError("Please enter your email first.");
        return;
      }

      const inferredName = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ").trim();
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: inferredName.length >= 2 ? inferredName : "Google User",
          requiredRole: "CUSTOMER",
        }),
      });

      const payload = (await response.json()) as AuthPayload;
      if (!response.ok && response.status !== 202) {
        setAuthError(payload.message || "Google sign-in failed.");
        return;
      }

      if (payload.requiresCompletion) {
        completeProfileFlow(payload.pendingToken);
        return;
      }

      completeAuthSuccess(payload.user);
    } catch {
      setAuthError("Unable to reach authentication service.");
    } finally {
      setAuthPending(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthPending(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: signupName,
          email: signupEmail.trim().toLowerCase(),
          password: signupPassword,
          role: "CUSTOMER",
        }),
      });
      const payload = (await response.json()) as AuthPayload;

      if (!response.ok) {
        setAuthError(payload.message || "Request failed.");
        return;
      }

      if (payload.requiresCompletion) {
        completeProfileFlow(payload.pendingToken);
        return;
      }

      completeAuthSuccess(payload.user);
    } catch {
      setAuthError("Unable to reach authentication service.");
    } finally {
      setAuthPending(false);
    }
  }

  async function handleGoogleSignup() {
    setAuthPending(true);
    setAuthError("");

    try {
      const normalizedEmail = signupEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        setAuthError("Please enter your email first.");
        return;
      }

      const fallbackNameFromEmail = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ").trim();
      const resolvedName = signupName.trim() || fallbackNameFromEmail || "Google User";
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: resolvedName.length >= 2 ? resolvedName : "Google User",
          role: "CUSTOMER",
        }),
      });

      const payload = (await response.json()) as AuthPayload;
      if (!response.ok && response.status !== 202) {
        setAuthError(payload.message || "Google sign-in failed.");
        return;
      }

      if (payload.requiresCompletion) {
        completeProfileFlow(payload.pendingToken);
        return;
      }

      completeAuthSuccess(payload.user);
    } catch {
      setAuthError("Unable to reach authentication service.");
    } finally {
      setAuthPending(false);
    }
  }

  async function handleLogout() {
    if (logoutPending) {
      return;
    }

    setLogoutPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setMobileMenuOpen(false);
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
            {visibleNavItems.map((item) => (
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
                <details className="relative">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-left hover:border-[#f0a26b] [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1de] text-sm font-bold text-[#b35311]">
                      {accountInitial}
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-semibold text-[#1f1f1f]">{accountTriggerLabel}</span>
                      <span className="block max-w-[10rem] truncate text-xs text-[var(--muted)]">
                        {accountDisplayName || user.email}
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-4 w-4 text-[#7a6a56]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 7l5 5 5-5" />
                    </svg>
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-64 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_12px_28px_rgba(17,24,39,0.16)]">
                    <div className="rounded-xl bg-[#faf7f2] px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b7d6b]">Signed in as</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-[#1f1f1f]">{accountDisplayName || user.email}</p>
                      <p className="text-xs text-[#7b6e5c]">{user.role}</p>
                    </div>
                    <div className="mt-2 grid gap-1">
                      {user.role === "ADMIN" ? (
                        <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-[#2d1d13] hover:bg-[#fff2e2]" href="/staff">
                          Admin Panel
                        </Link>
                      ) : null}
                      {user.role === "CUSTOMER" ? (
                        <Link className="rounded-lg px-3 py-2 text-sm font-medium text-[#2d1d13] hover:bg-[#fff2e2]" href="/auth/complete-profile">
                          Profile details
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#c2410c] hover:bg-[#fff2e2] disabled:opacity-60"
                        onClick={() => void handleLogout()}
                        disabled={logoutPending}
                      >
                        {logoutPending ? "Logging out..." : "Log out"}
                      </button>
                    </div>
                  </div>
                </details>
              ) : user === null ? (
                <button
                  type="button"
                  className="gt-btn gt-btn-primary"
                  onClick={() => openAuthModal("login")}
                >
                  Account
                </button>
              ) : null}
            </div>
            <details
              className="gt-mobile-nav md:hidden"
              open={mobileMenuOpen}
              onToggle={(event) => setMobileMenuOpen(event.currentTarget.open)}
            >
              <summary>Menu</summary>
              <div className="gt-mobile-menu">
                {visibleNavItems.map((item) => (
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
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b7d6b]">Signed in as</p>
                        <p className="mt-0.5 font-semibold text-[#1f1f1f]">{accountDisplayName || user.email}</p>
                        <p className="text-[var(--muted)]">{user.role}</p>
                      </div>
                      {user.role === "ADMIN" ? (
                        <Link className="gt-btn gt-btn-outline justify-center" href="/staff">
                          Admin Panel
                        </Link>
                      ) : null}
                      {user.role === "CUSTOMER" ? (
                        <Link className="gt-btn gt-btn-outline justify-center" href="/auth/complete-profile">
                          Profile details
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="gt-btn gt-btn-outline justify-center"
                        onClick={() => void handleLogout()}
                        disabled={logoutPending}
                      >
                        {logoutPending ? "Logging out..." : "Log out"}
                      </button>
                    </>
                  ) : user === null ? (
                    <button
                      type="button"
                      className="gt-btn gt-btn-primary justify-center"
                      onClick={() => openAuthModal("login")}
                    >
                      Account
                    </button>
                  ) : null}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {isClient && authView
        ? createPortal(
            <div className="fixed inset-0 z-[100] p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/70"
                onClick={closeAuthModal}
                aria-label="Close authentication dialog"
              />
              <div className="relative z-10 flex min-h-full items-center justify-center">
                <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
            className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[22px] border-[3px] border-[#2d1d13] bg-[linear-gradient(155deg,#fff4dd_0%,#f9ecd4_60%,#e7f6ef_100%)] p-5 shadow-[6px_6px_0_0_#2d1d13] sm:p-6"
          >
            <button
              type="button"
              onClick={closeAuthModal}
              disabled={authPending}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2d1d13] bg-white text-sm font-bold text-[#2d1d13] disabled:opacity-50"
              aria-label="Close"
            >
              X
            </button>

            <div className="mb-4 mt-1 grid grid-cols-2 rounded-xl border-2 border-[#2d1d13] bg-[#fff9ef] p-1">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                disabled={authPending}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  authView === "login" ? "bg-[var(--accent)] text-white" : "text-[#5f4a38] hover:bg-[#f6ead6]"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                disabled={authPending}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  authView === "signup" ? "bg-[var(--accent)] text-white" : "text-[#5f4a38] hover:bg-[#f6ead6]"
                }`}
              >
                Sign up
              </button>
            </div>

            {authView === "login" ? (
              <div>
                <h2 id="auth-dialog-title" className="text-3xl font-black leading-tight text-[#1f1f1f]">
                  Log in
                </h2>
                <p className="mt-1 text-sm text-[#644b33]">Sign in without leaving this page.</p>

                <GoogleAuthButton
                  type="button"
                  onClick={() => void handleGoogleLogin()}
                  disabled={authPending}
                  className="mt-4"
                />

                <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8b6b4a]">
                  <div className="h-px flex-1 bg-[#d7c7b1]" />
                  Or
                  <div className="h-px flex-1 bg-[#d7c7b1]" />
                </div>

                <form className="grid gap-3" onSubmit={handlePasswordLogin}>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4f3f2e]">Email</span>
                    <input
                      className="rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#1d2b57] placeholder:text-[#8f8579]"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4f3f2e]">Password</span>
                    <input
                      className="rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#1d2b57] placeholder:text-[#8f8579]"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      required
                    />
                  </label>

                  <button
                    className="mt-1 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-70"
                    type="submit"
                    disabled={authPending}
                  >
                    {authPending ? "Signing in..." : "Continue"}
                  </button>
                </form>

                <p className="mt-3 text-sm text-[#4f3f2e]">
                  Forgot password?{" "}
                  <Link className="font-semibold underline" href="/auth/forgot-password" onClick={closeAuthModal}>
                    Reset here
                  </Link>
                </p>
              </div>
            ) : (
              <div>
                <h2 id="auth-dialog-title" className="text-3xl font-black leading-tight text-[#1f1f1f]">
                  Create account
                </h2>
                <p className="mt-1 text-sm text-[#644b33]">Sign up without leaving this page.</p>

                <GoogleAuthButton
                  type="button"
                  onClick={() => void handleGoogleSignup()}
                  disabled={authPending}
                  className="mt-4"
                />

                <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8b6b4a]">
                  <div className="h-px flex-1 bg-[#d7c7b1]" />
                  Or
                  <div className="h-px flex-1 bg-[#d7c7b1]" />
                </div>

                <form className="grid gap-3" onSubmit={handleSignup}>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4f3f2e]">Full Name</span>
                    <input
                      className="rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#1d2b57] placeholder:text-[#8f8579]"
                      type="text"
                      placeholder="Your name"
                      value={signupName}
                      onChange={(event) => setSignupName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4f3f2e]">Email</span>
                    <input
                      className="rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#1d2b57] placeholder:text-[#8f8579]"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(event) => setSignupEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4f3f2e]">Password</span>
                    <input
                      className="rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] px-3 py-2.5 text-sm text-[#1d2b57] placeholder:text-[#8f8579]"
                      type="password"
                      placeholder="Create a strong password"
                      value={signupPassword}
                      onChange={(event) => setSignupPassword(event.target.value)}
                      required
                      minLength={8}
                    />
                  </label>

                  <button
                    className="mt-1 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-70"
                    type="submit"
                    disabled={authPending}
                  >
                    {authPending ? "Creating..." : "Create account"}
                  </button>
                </form>
              </div>
            )}

            {authError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p>
            ) : null}
                </section>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}

