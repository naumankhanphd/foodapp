"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleAuthButton } from "@/components/google-auth-button";

const navItems = [
  { key: "menu", href: "/menu", label: "Menu" },
  { key: "offers", href: "/offers", label: "Offers" },
];
const neutralNavItems = navItems;

function inferNamesFromEmail(emailValue: string) {
  const localPart = emailValue
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  if (!localPart) {
    return { firstName: "Google", lastName: "" };
  }

  const parts = localPart.split(/\s+/);
  return {
    firstName: parts[0] || "Google",
    lastName: parts.slice(1).join(" "),
  };
}

type SessionUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: "CUSTOMER" | "ADMIN";
};

type AuthView = "login" | "signup";

type AuthPayload = {
  user?: SessionUser;
  message?: string;
  requiresCompletion?: boolean;
  pendingToken?: string;
};

type GuestCartSnapshot = {
  itemCount: number;
  subtotal: number;
};

type GuestCartItem = {
  id: string;
  itemName: string;
  quantity: number;
  lineTotal: number;
};

type GuestCartApiPayload = {
  message?: string;
  cart?: {
    itemCount?: number;
    subtotal?: number;
    items?: Array<{
      id?: string;
      itemName?: string;
      quantity?: number;
      lineTotal?: number;
    }>;
  };
};

function formatEuro(value: number) {
  return `\u20AC${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function parseGuestCartItems(payload: GuestCartApiPayload): GuestCartItem[] {
  return Array.isArray(payload.cart?.items)
    ? payload.cart.items
        .map((item) => ({
          id: String(item.id || ""),
          itemName: String(item.itemName || "").trim(),
          quantity: Number(item.quantity || 0),
          lineTotal: Number(item.lineTotal || 0),
        }))
        .filter((item) => item.id && item.itemName && item.quantity > 0)
    : [];
}

export function SiteHero() {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith("/auth/complete-profile");
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [logoutPending, setLogoutPending] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [guestCart, setGuestCart] = useState<GuestCartSnapshot>({ itemCount: 0, subtotal: 0 });
  const [guestCartItems, setGuestCartItems] = useState<GuestCartItem[]>([]);
  const [guestCartDrawerOpen, setGuestCartDrawerOpen] = useState(false);
  const [guestCartMutatingIds, setGuestCartMutatingIds] = useState<string[]>([]);
  const [guestCartActionError, setGuestCartActionError] = useState("");
  const [venueComment, setVenueComment] = useState("");
  const [venueCommentDraft, setVenueCommentDraft] = useState("");
  const [isVenueCommentEditing, setIsVenueCommentEditing] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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

  const accountDisplayName = (`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.fullName || user?.email || "").trim();
  const accountInitial = (accountDisplayName.charAt(0) || "U").toUpperCase();
  const accountTriggerLabel = user?.role === "ADMIN" ? "Admin" : "Account";
  const hasGuestCartItems = user === null && guestCart.itemCount > 0;
  const showMobileGuestOrderBar = hasGuestCartItems && !guestCartDrawerOpen;

  const applyGuestCartPayload = useCallback((payload: GuestCartApiPayload) => {
    const itemCount = Number(payload.cart?.itemCount || 0);
    const subtotal = Number(payload.cart?.subtotal || 0);
    const parsedItems = parseGuestCartItems(payload);

    setGuestCart({
      itemCount: Number.isFinite(itemCount) ? itemCount : 0,
      subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    });
    setGuestCartItems(parsedItems);
    if (itemCount <= 0) {
      setGuestCartDrawerOpen(false);
    }
  }, []);

  function setGuestCartItemMutating(itemId: string, pending: boolean) {
    setGuestCartMutatingIds((current) => {
      if (pending) {
        return current.includes(itemId) ? current : [...current, itemId];
      }
      return current.filter((entry) => entry !== itemId);
    });
  }

  async function changeGuestCartItemQuantity(item: GuestCartItem, nextQuantity: number) {
    if (nextQuantity < 1) {
      return;
    }

    setGuestCartActionError("");
    setGuestCartItemMutating(item.id, true);
    try {
      const response = await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: nextQuantity }),
      });

      const payload = (await response.json().catch(() => ({}))) as GuestCartApiPayload;
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update quantity.");
      }

      applyGuestCartPayload(payload);
    } catch (caught) {
      setGuestCartActionError(caught instanceof Error ? caught.message : "Unable to update quantity.");
    } finally {
      setGuestCartItemMutating(item.id, false);
    }
  }

  async function deleteGuestCartItem(item: GuestCartItem) {
    setGuestCartActionError("");
    setGuestCartItemMutating(item.id, true);
    try {
      const response = await fetch(`/api/cart/items/${item.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as GuestCartApiPayload;
      if (!response.ok) {
        throw new Error(payload.message || "Unable to remove item.");
      }

      applyGuestCartPayload(payload);
    } catch (caught) {
      setGuestCartActionError(caught instanceof Error ? caught.message : "Unable to remove item.");
    } finally {
      setGuestCartItemMutating(item.id, false);
    }
  }

  function startVenueCommentEdit() {
    setVenueCommentDraft(venueComment);
    setIsVenueCommentEditing(true);
  }

  function cancelVenueCommentEdit() {
    setVenueCommentDraft(venueComment);
    setIsVenueCommentEditing(false);
  }

  function saveVenueComment() {
    setVenueComment(venueCommentDraft.trim().slice(0, 280));
    setIsVenueCommentEditing(false);
  }

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
    if (user !== null) {
      setGuestCart((current) =>
        current.itemCount === 0 && current.subtotal === 0
          ? current
          : { itemCount: 0, subtotal: 0 },
      );
      setGuestCartItems((current) => (current.length === 0 ? current : []));
      setGuestCartMutatingIds((current) => (current.length === 0 ? current : []));
      setGuestCartActionError("");
      setGuestCartDrawerOpen(false);
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadGuestCart = async () => {
      try {
        const response = await fetch("/api/cart", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json()) as GuestCartApiPayload;
        if (!cancelled) {
          applyGuestCartPayload(payload);
        }
      } catch {
        // Ignore cart header refresh errors.
      }
    };

    void loadGuestCart();
    intervalId = setInterval(() => {
      void loadGuestCart();
    }, 3000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [applyGuestCartPayload, pathname, user]);

  useEffect(() => {
    setGuestCartDrawerOpen(false);
    setGuestCartActionError("");
  }, [pathname]);

  useEffect(() => {
    if (!guestCartDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGuestCartDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [guestCartDrawerOpen]);

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

    setGuestCartDrawerOpen(false);
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

  function completeProfileFlow(pendingToken?: string, emailHint?: string) {
    setAuthView(null);
    setAuthError("");
    const query = new URLSearchParams({
      next: postAuthPath,
    });
    if (pendingToken) {
      query.set("pending", pendingToken);
    }
    if (emailHint) {
      query.set("email", emailHint);
    }
    router.push(`/auth/complete-profile?${query.toString()}`);
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthPending(true);
    setAuthError("");

    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
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
        completeProfileFlow(payload.pendingToken, normalizedEmail);
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
      const inferredNames = inferNamesFromEmail(normalizedEmail);
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          firstName: inferredNames.firstName,
          lastName: inferredNames.lastName,
          requiredRole: "CUSTOMER",
        }),
      });

      const payload = (await response.json()) as AuthPayload;
      if (!response.ok && response.status !== 202) {
        setAuthError(payload.message || "Google sign-in failed.");
        return;
      }

      if (payload.requiresCompletion) {
        completeProfileFlow(payload.pendingToken, normalizedEmail);
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
      const normalizedEmail = signupEmail.trim().toLowerCase();
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
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
        completeProfileFlow(payload.pendingToken, normalizedEmail);
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
      const inferredNames = inferNamesFromEmail(normalizedEmail);
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          firstName: inferredNames.firstName,
          lastName: inferredNames.lastName,
          role: "CUSTOMER",
        }),
      });

      const payload = (await response.json()) as AuthPayload;
      if (!response.ok && response.status !== 202) {
        setAuthError(payload.message || "Google sign-in failed.");
        return;
      }

      if (payload.requiresCompletion) {
        completeProfileFlow(payload.pendingToken, normalizedEmail);
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

  if (hideChrome) {
    return null;
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
                hasGuestCartItems ? (
                  <button
                    type="button"
                    onClick={() => setGuestCartDrawerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[#ea6b12]"
                  >
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b35311] px-1 text-[11px] leading-none text-white">
                      {guestCart.itemCount}
                    </span>
                    <span>View order</span>
                    <span className="font-bold">{formatEuro(guestCart.subtotal)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gt-btn gt-btn-primary"
                    onClick={() => openAuthModal("login")}
                  >
                    Account
                  </button>
                )
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
            <div className="fixed inset-0 z-[100] p-0 sm:p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/70"
                onClick={closeAuthModal}
                aria-label="Close authentication dialog"
              />
              <div className="pointer-events-none relative z-10 flex min-h-full items-end sm:items-center sm:justify-center">
                <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
            className="gt-auth-sheet pointer-events-auto relative w-full max-h-[92vh] overflow-y-auto rounded-t-[24px] border-x-[3px] border-t-[3px] border-[#2d1d13] bg-[linear-gradient(155deg,#fff4dd_0%,#f9ecd4_60%,#e7f6ef_100%)] p-5 pb-7 shadow-[0_-14px_28px_rgba(0,0,0,0.4)] sm:max-h-[calc(100vh-2rem)] sm:max-w-md sm:rounded-[22px] sm:border-[3px] sm:p-6 sm:shadow-[6px_6px_0_0_#2d1d13]"
          >
            <div className="mb-4 mt-1 grid grid-cols-2 gap-1 rounded-xl border-2 border-[#2d1d13] bg-[#fff9ef] p-1">
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

      {isClient && guestCartDrawerOpen
        ? createPortal(
            <div className="fixed inset-0 z-[95]">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Close order panel"
                onClick={() => setGuestCartDrawerOpen(false)}
              />
              <aside className="absolute bottom-0 left-0 right-0 flex max-h-[88vh] min-h-0 flex-col overflow-hidden rounded-t-[24px] border-x-[3px] border-t-[3px] border-[#2d1d13] bg-[linear-gradient(155deg,#fff4dd_0%,#f9ecd4_60%,#e7f6ef_100%)] p-5 shadow-[0_-10px_22px_rgba(0,0,0,0.32)] md:bottom-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:border-x-0 md:border-y-0 md:border-l-[3px] md:shadow-[-8px_0_0_#2d1d13]">
                <div className="flex shrink-0 items-center justify-between">
                  <h2 className="text-3xl font-black text-[#1f1f1f]">Your order</h2>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#2d1d13] bg-[#fff9ef] text-xl font-bold text-[#2d1d13] hover:bg-[#f6ead6]"
                    onClick={() => setGuestCartDrawerOpen(false)}
                    aria-label="Close order panel"
                  >
                    x
                  </button>
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid gap-3">
                    {guestCartItems.length > 0 ? (
                      guestCartItems.map((item) => {
                        const isMutating = guestCartMutatingIds.includes(item.id);
                        return (
                          <article
                            key={item.id}
                            className="rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] p-3 shadow-[3px_3px_0_0_#2d1d13]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-base font-extrabold text-[#1f1f1f]">{item.itemName}</h3>
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#6b5b49]">
                                  Quantity: {item.quantity}
                                </p>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${item.itemName}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d14343] bg-[#fff1f1] text-[#b91c1c] disabled:opacity-50 sm:h-7 sm:w-7"
                                disabled={isMutating}
                                onClick={() => void deleteGuestCartItem(item)}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <p className="text-base font-black text-[#1f1f1f]">{formatEuro(item.lineTotal)}</p>
                              <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#2d1d13] bg-[#fff9ef] p-1.5 sm:gap-1 sm:p-1">
                                <button
                                  type="button"
                                  aria-label={`Decrease quantity for ${item.itemName}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2d1d13] bg-white text-sm font-bold text-[#2d1d13] disabled:opacity-50 sm:h-7 sm:w-7"
                                  disabled={isMutating || item.quantity <= 1}
                                  onClick={() => void changeGuestCartItemQuantity(item, item.quantity - 1)}
                                >
                                  -
                                </button>
                                <span className="min-w-6 text-center text-sm font-extrabold text-[#1f1f1f]">{item.quantity}</span>
                                <button
                                  type="button"
                                  aria-label={`Increase quantity for ${item.itemName}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)] disabled:opacity-50 sm:h-7 sm:w-7"
                                  disabled={isMutating || item.quantity >= 20}
                                  onClick={() => void changeGuestCartItemQuantity(item, item.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] p-3 text-sm text-[#4f3f2e]">
                        Your order is empty.
                      </p>
                    )}
                  </div>

                  {guestCartActionError ? (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {guestCartActionError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 shrink-0 rounded-xl border-2 border-[#2d1d13] bg-[#fff9ef] p-4">
                  <p className="flex items-center justify-between text-sm text-[#4f3f2e]">
                    <span className="font-semibold">Items</span>
                    <span className="font-bold">{guestCart.itemCount}</span>
                  </p>
                  <p className="mt-2 flex items-center justify-between text-lg font-black text-[#1f1f1f]">
                    <span>Subtotal</span>
                    <span>{formatEuro(guestCart.subtotal)}</span>
                  </p>
                  <div className="mt-4 rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-[#1f1f1f]">Add comment for venue</p>
                        {!isVenueCommentEditing ? (
                          <p className="mt-1 text-sm text-[#5d5648]">
                            {venueComment
                              ? venueComment
                              : "Special requests, allergies, dietary restrictions, or greeting text..."}
                          </p>
                        ) : null}
                      </div>
                      {!isVenueCommentEditing ? (
                        <button
                          type="button"
                          className="rounded-lg border border-[#2d1d13] bg-[#fff9ef] px-2.5 py-1 text-xs font-semibold text-[#2d1d13] hover:bg-[#f6ead6]"
                          onClick={startVenueCommentEdit}
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>

                    {isVenueCommentEditing ? (
                      <div className="mt-2 grid gap-2">
                        <textarea
                          className="min-h-24 w-full rounded-lg border-2 border-[#2d1d13] bg-[#fff9ef] px-3 py-2 text-sm text-[#1f1f1f] placeholder:text-[#7b6e5c]"
                          maxLength={280}
                          value={venueCommentDraft}
                          onChange={(event) => setVenueCommentDraft(event.target.value)}
                          placeholder="Special requests, allergies, dietary restrictions, or greeting text..."
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#7b6e5c]">{venueCommentDraft.length}/280</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-[#2d1d13] bg-[#fff9ef] px-3 py-1.5 text-xs font-semibold text-[#2d1d13] hover:bg-[#f6ead6]"
                              onClick={cancelVenueCommentEdit}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)] hover:bg-[#ea6b12]"
                              onClick={saveVenueComment}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:bg-[#ea6b12]"
                      onClick={() => openAuthModal("login")}
                    >
                      Login to checkout
                    </button>
                  </div>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}

      {isClient && showMobileGuestOrderBar
        ? createPortal(
            <button
              type="button"
              onClick={() => setGuestCartDrawerOpen(true)}
              className="fixed inset-x-4 bottom-4 z-[95] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.28)] md:hidden"
            >
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#b35311] px-1 text-[11px] leading-none text-white">
                {guestCart.itemCount}
              </span>
              <span className="flex-1 text-left">View order</span>
              <span className="font-bold">{formatEuro(guestCart.subtotal)}</span>
            </button>,
            document.body,
          )
        : null}
    </header>
  );
}


