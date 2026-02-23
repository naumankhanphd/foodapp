"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { CHECKOUT_RESTRICTION_POLICY } from "@/lib/auth/config.mjs";
import { GoogleAuthButton } from "@/components/google-auth-button";

type LoginPayload = {
  message?: string;
  requiresCompletion?: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => searchParams.get("next") || "/menu", [searchParams]);
  const loginRole = useMemo(() => (searchParams.get("role") || "CUSTOMER").toUpperCase(), [searchParams]);
  const requiredRole = useMemo(() => {
    if (loginRole === "ADMIN") {
      return "ADMIN";
    }
    return "CUSTOMER";
  }, [loginRole]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          requiredRole,
        }),
      });
      const payload = (await response.json()) as LoginPayload;

      if (!response.ok) {
        setError(payload.message || "Request failed.");
        return;
      }

      if (payload.requiresCompletion) {
        router.push(`/auth/complete-profile?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      router.push(requiredRole === "ADMIN" ? "/staff" : nextPath);
      router.refresh();
    } catch {
      setError("Unable to reach authentication service.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleLogin() {
    setPending(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError("Please enter your email first.");
        return;
      }
      const inferredName = normalizedEmail
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .trim();

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: inferredName.length >= 2 ? inferredName : "Google User",
          requiredRole,
        }),
      });

      const payload = (await response.json()) as {
        requiresCompletion?: boolean;
        pendingToken?: string;
        message?: string;
      };

      if (!response.ok && response.status !== 202) {
        setError(payload.message || "Google sign-in failed.");
        return;
      }

      if (payload.requiresCompletion && payload.pendingToken) {
        router.push(`/auth/complete-profile?pending=${encodeURIComponent(payload.pendingToken)}&next=${encodeURIComponent(nextPath)}`);
        return;
      }
      if (payload.requiresCompletion) {
        router.push(`/auth/complete-profile?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      router.push(requiredRole === "ADMIN" ? "/staff" : nextPath);
      router.refresh();
    } catch {
      setError("Unable to reach authentication service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-69px)] bg-[linear-gradient(90deg,#dff2ec_0%,#f5f7fb_28%,#f5f7fb_100%)] py-8 sm:py-12">
      <div className="shell">
        <section className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--line)] bg-white p-6 shadow-[0_2px_18px_rgba(18,29,54,0.08)] sm:p-8">
          <h1 className="text-4xl font-black leading-tight text-[#18203c] sm:text-5xl">Login</h1>
          <p className="mt-2 text-base text-[#2f3d66]">Sign in to manage your account and orders.</p>

          <GoogleAuthButton
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={pending}
          />

          <div className="my-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#384776]">
            <div className="h-px flex-1 bg-[var(--line)]" />
            OR
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <form className="grid gap-3" onSubmit={handlePasswordLogin}>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d3f72]">Email</span>
              <input
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[#1d2b57]"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d3f72]">Password</span>
              <input
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[#1d2b57]"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button
              className="mt-1 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-[var(--accent-ink)] disabled:opacity-70"
              type="submit"
              disabled={pending}
            >
              {pending ? "Signing in..." : "Continue"}
            </button>
          </form>

          {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <p className="mt-5 text-base text-[#24335f]">
            No account yet?{" "}
            <Link className="font-semibold underline" href="/auth/signup">
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-sm text-[#516192]">
            Forgot password?{" "}
            <Link className="font-semibold underline" href="/auth/forgot-password">
              Reset here
            </Link>
          </p>
          <p className="mt-4 text-xs text-[#5a6793]">Policy: {CHECKOUT_RESTRICTION_POLICY}</p>
        </section>
      </div>
    </main>
  );
}
