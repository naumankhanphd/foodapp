"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { CART_UPDATED_EVENT, dispatchCartUpdated } from "@/lib/cart/events";

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
  const guestCartMutatingRef = useRef<Set<string>>(new Set());
  const guestCartQueuedDeltasRef = useRef<Map<string, number>>(new Map());
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
    return parsedItems;
  }, []);

  function setGuestCartItemMutating(itemId: string, pending: boolean) {
    setGuestCartMutatingIds((current) => {
      if (pending) {
        return current.includes(itemId) ? current : [...current, itemId];
      }
      return current.filter((entry) => entry !== itemId);
    });
  }

  function beginGuestCartMutation(itemId: string) {
    if (guestCartMutatingRef.current.has(itemId)) {
      return false;
    }
    guestCartMutatingRef.current.add(itemId);
    setGuestCartItemMutating(itemId, true);
    return true;
  }

  function finishGuestCartMutation(itemId: string) {
    if (!guestCartMutatingRef.current.has(itemId)) {
      return;
    }
    guestCartMutatingRef.current.delete(itemId);
    setGuestCartItemMutating(itemId, false);
  }

  function queueGuestCartDelta(itemId: string, delta: number) {
    const current = guestCartQueuedDeltasRef.current.get(itemId) || 0;
    const next = current + delta;
    if (next === 0) {
      guestCartQueuedDeltasRef.current.delete(itemId);
      return;
    }
    guestCartQueuedDeltasRef.current.set(itemId, next);
  }

  function consumeGuestCartDelta(itemId: string) {
    const queued = guestCartQueuedDeltasRef.current.get(itemId) || 0;
    guestCartQueuedDeltasRef.current.delete(itemId);
    return queued;
  }

  function clampGuestQuantity(quantity: number) {
    return Math.max(0, Math.min(20, quantity));
  }

  async function applyGuestCartQuantity(itemId: string, desiredQuantity: number) {
    const response =
      desiredQuantity <= 0
        ? await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" })
        : await fetch(`/api/cart/items/${itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: desiredQuantity }),
          });

    const payload = (await response.json().catch(() => ({}))) as GuestCartApiPayload;
    if (!response.ok) {
      throw new Error(payload.message || "Unable to update quantity.");
    }

    const nextItems = applyGuestCartPayload(payload);
    dispatchCartUpdated();
    return nextItems;
  }

  async function changeGuestCartItemQuantity(item: GuestCartItem, delta: number) {
    if (delta === 0) {
      return;
    }
    if (!beginGuestCartMutation(item.id)) {
      queueGuestCartDelta(item.id, delta);
      return;
    }

    setGuestCartActionError("");
    try {
      let latestItems = guestCartItems;
      let pendingDelta = delta;

      while (pendingDelta !== 0) {
        const liveItem = latestItems.find((entry) => entry.id === item.id);
        if (!liveItem) {
          break;
        }

        const targetQuantity = clampGuestQuantity(liveItem.quantity + pendingDelta);
        if (targetQuantity === liveItem.quantity) {
          pendingDelta = consumeGuestCartDelta(item.id);
          continue;
        }

        latestItems = await applyGuestCartQuantity(item.id, targetQuantity);
        pendingDelta = consumeGuestCartDelta(item.id);
      }
    } catch (caught) {
      setGuestCartActionError(caught instanceof Error ? caught.message : "Unable to update quantity.");
    } finally {
      finishGuestCartMutation(item.id);
      const trailingDelta = consumeGuestCartDelta(item.id);
      if (trailingDelta !== 0) {
        const sign = trailingDelta > 0 ? 1 : -1;
        const remainder = trailingDelta - sign;
        if (remainder !== 0) {
          queueGuestCartDelta(item.id, remainder);
        }
        void changeGuestCartItemQuantity(item, sign);
      }
    }
  }

  async function deleteGuestCartItem(item: GuestCartItem) {
    if (!beginGuestCartMutation(item.id)) {
      return;
    }
    guestCartQueuedDeltasRef.current.delete(item.id);
    setGuestCartActionError("");
    try {
      await applyGuestCartQuantity(item.id, 0);
    } catch (caught) {
      setGuestCartActionError(caught instanceof Error ? caught.message : "Unable to remove item.");
    } finally {
      finishGuestCartMutation(item.id);
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
      guestCartMutatingRef.current.clear();
      guestCartQueuedDeltasRef.current.clear();
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
    const onCartUpdated = () => {
      void loadGuestCart();
    };
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
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
            <span className="gt-brand-word">Tikanmaan</span>
            <span className="gt-brand-sub">Pizzeria</span>
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
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-3 py-2 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)] hover:bg-[#262626]"
                  >
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-black leading-none text-white">
                      {guestCart.itemCount}
                    </span>
                    <span>View order</span>
                    <span className="font-black text-white/80">{formatEuro(guestCart.subtotal)}</span>
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
              <aside className="absolute bottom-0 left-0 right-0 flex h-[90vh] max-h-[90vh] min-h-0 flex-col overflow-hidden rounded-t-[24px] border-x-[3px] border-t-[3px] border-[#1a1a1a] bg-[#f4eed8] p-5 shadow-[0_-10px_22px_rgba(0,0,0,0.32)] md:bottom-0 md:left-auto md:right-0 md:top-0 md:h-auto md:max-h-none md:w-full md:max-w-lg md:rounded-none md:border-x-0 md:border-y-0 md:border-l-[3px] md:shadow-[-8px_0_0_#1a1a1a]">
                <div className="shrink-0 border-b-4 border-[#1a1a1a] pb-3" style={{ fontFamily: "Georgia, serif" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-neutral-500">★ Kitchen Gazette ★</p>
                      <h2 className="text-3xl font-black uppercase leading-none tracking-tight text-[#1a1a1a]">Your Order</h2>
                    </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#1a1a1a] bg-white text-2xl font-bold leading-none text-[#1a1a1a] hover:bg-neutral-100"
                    onClick={() => setGuestCartDrawerOpen(false)}
                    aria-label="Close order panel"
                  >
                    &times;
                  </button>
                  </div>
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid gap-5 py-2">
                    {guestCartItems.length > 0 ? (
                      guestCartItems.map((item, idx) => {
                        const isMutating = guestCartMutatingIds.includes(item.id);
                        const stickyBgs  = ["#fef08a","#fce7f3","#bfdbfe","#bbf7d0"];
                        const stickyText = ["#713f12","#831843","#1e40af","#065f46"];
                        const stickyAcc  = ["#f59e0b","#ec4899","#3b82f6","#10b981"];
                        const stickyRots = ["-1.5deg","0.8deg","-0.8deg","1.2deg"];
                        const bg  = stickyBgs [idx % 4];
                        const txt = stickyText[idx % 4];
                        const acc = stickyAcc [idx % 4];
                        const rot = stickyRots[idx % 4];
                        return (
                          <article
                            key={item.id}
                            className="relative p-3"
                            style={{
                              background: bg,
                              boxShadow: "3px 3px 10px rgba(0,0,0,0.18), -1px -1px 3px rgba(0,0,0,0.05)",
                              transform: `rotate(${rot})`,
                              fontFamily: "'Segoe Print', 'Comic Sans MS', cursive",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-base font-extrabold" style={{ color: txt }}>{item.itemName}</h3>
                                <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: txt, opacity: 0.7 }}>
                                  Qty: {item.quantity}
                                </p>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${item.itemName}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400 bg-white/60 text-red-500 disabled:opacity-50 sm:h-7 sm:w-7"
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
                              <p className="text-base font-black" style={{ color: txt }}>{formatEuro(item.lineTotal)}</p>
                              <div className="inline-flex items-stretch border-2" style={{ borderColor: acc }}>
                                <button
                                  type="button"
                                  aria-label={`Decrease quantity for ${item.itemName}`}
                                  className="inline-flex h-9 w-9 items-center justify-center border-r-2 bg-white/70 text-lg font-black leading-none disabled:opacity-40"
                                  style={{ borderColor: acc, color: acc }}
                                  disabled={item.quantity <= 1}
                                  onClick={() => void changeGuestCartItemQuantity(item, -1)}
                                >
                                  −
                                </button>
                                <span className="flex min-w-8 items-center justify-center px-1 text-sm font-extrabold" style={{ color: txt }}>{item.quantity}</span>
                                <button
                                  type="button"
                                  aria-label={`Increase quantity for ${item.itemName}`}
                                  className="inline-flex h-9 w-9 items-center justify-center border-l-2 text-base font-black leading-none text-white disabled:opacity-40"
                                  style={{ borderColor: acc, background: acc }}
                                  disabled={item.quantity >= 20}
                                  onClick={() => void changeGuestCartItemQuantity(item, 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="p-3 text-sm" style={{ background: "#fef08a", fontFamily: "'Segoe Print', 'Comic Sans MS', cursive", boxShadow: "3px 3px 10px rgba(0,0,0,0.15)", color: "#713f12" }}>
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

                <div className="mt-4 shrink-0 border-2 border-[#1a1a1a] bg-[#f4eed8] p-4" style={{ fontFamily: "Georgia, serif" }}>
                  <div className="border-b-2 border-t-2 border-[#1a1a1a] py-1 text-center">
                    <p className="text-[0.55rem] font-black uppercase tracking-[0.22em] text-[#1a1a1a]">★ Order Summary ★</p>
                  </div>
                  <p className="mt-3 flex items-center justify-between text-sm text-[#3a3020]">
                    <span className="font-semibold uppercase tracking-wide">Items</span>
                    <span className="font-bold">{guestCart.itemCount}</span>
                  </p>
                  <p className="mt-1 flex items-center justify-between text-2xl font-black text-[#1a1a1a]">
                    <span className="uppercase tracking-tight">Subtotal</span>
                    <span>{formatEuro(guestCart.subtotal)}</span>
                  </p>
                  <div className="mt-3 border-2 border-[#1a1a1a] bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-[#1a1a1a]">Add comment for venue</p>
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
                          className="border border-[#1a1a1a] bg-white px-2.5 py-1 text-xs font-semibold text-[#1a1a1a] hover:bg-neutral-100"
                          onClick={startVenueCommentEdit}
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>

                    {isVenueCommentEditing ? (
                      <div className="mt-2 grid gap-2">
                        <textarea
                          className="min-h-24 w-full border-2 border-[#1a1a1a] bg-[#fffdf8] px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#7b6e5c]"
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
                              className="border border-[#1a1a1a] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] hover:bg-neutral-100"
                              onClick={cancelVenueCommentEdit}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                              onClick={saveVenueComment}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="w-full border-2 border-[#1a1a1a] shadow-[4px_4px_0_0_#1a1a1a] transition-[box-shadow,transform] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#1a1a1a]"
                      onClick={() => openAuthModal("login")}
                    >
                      <div className="flex items-stretch">
                        <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 border-r-2 border-[#1a1a1a] bg-[#fef08a] py-4">
                          <span className="text-lg font-black leading-none text-[#1a1a1a]">★</span>
                          <span className="text-[0.45rem] font-black uppercase tracking-widest text-[#1a1a1a]/60" style={{ fontFamily: "Georgia, serif", writingMode: "vertical-lr" }}>order</span>
                        </div>
                        <div className="flex flex-1 items-center justify-between bg-[#1a1a1a] px-4 py-4" style={{ fontFamily: "Georgia, serif" }}>
                          <div className="text-left">
                            <p className="text-[0.48rem] font-bold uppercase tracking-[0.3em] text-white/50">Ready to order?</p>
                            <p className="text-sm font-black uppercase tracking-widest text-white">Login to Checkout</p>
                          </div>
                          <span className="text-2xl font-black text-white/70">→</span>
                        </div>
                      </div>
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
              className="fixed inset-x-4 bottom-8 z-[95] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#1a1a1a] px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] md:hidden"
            >
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-white">
                {guestCart.itemCount}
              </span>
              <span className="flex-1 text-left text-sm font-semibold text-white">View order</span>
              <span className="text-sm font-black text-white/80">{formatEuro(guestCart.subtotal)}</span>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white/50" aria-hidden="true">
                <path d="M5 10h10M11 6l4 4-4 4" />
              </svg>
            </button>,
            document.body,
          )
        : null}
    </header>
  );
}


