"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";

export default function SignupPage() {
  const router = useRouter();
  const defaultRole = "CUSTOMER";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: defaultRole,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        requiresCompletion?: boolean;
      };

      if (!response.ok) {
        setError(payload.message || "Request failed.");
        return;
      }

      if (payload.requiresCompletion) {
        router.push(`/auth/complete-profile?next=${encodeURIComponent("/menu")}`);
        return;
      }

      router.push("/menu");
      router.refresh();
    } catch {
      setError("Unable to reach authentication service.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignup() {
    setPending(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError("Please enter your email first.");
        return;
      }

      const fallbackNameFromEmail = normalizedEmail
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .trim();
      const resolvedName = fullName.trim() || fallbackNameFromEmail || "Google User";

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          fullName: resolvedName.length >= 2 ? resolvedName : "Google User",
          role: defaultRole,
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
        router.push(`/auth/complete-profile?pending=${encodeURIComponent(payload.pendingToken)}&next=${encodeURIComponent("/menu")}`);
        return;
      }
      if (payload.requiresCompletion) {
        router.push(`/auth/complete-profile?next=${encodeURIComponent("/menu")}`);
        return;
      }

      router.push("/menu");
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
          <h1 className="text-4xl font-black leading-tight text-[#18203c] sm:text-5xl">Create account</h1>
          <p className="mt-2 text-base text-[#2f3d66]">
            Sign up to save your details and manage orders. New accounts are created as customer.
          </p>

          <GoogleAuthButton
            type="button"
            onClick={() => void handleGoogleSignup()}
            disabled={pending}
          />

          <div className="my-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#384776]">
            <div className="h-px flex-1 bg-[var(--line)]" />
            OR
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <form className="grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d3f72]">Full Name</span>
              <input
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[#1d2b57]"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
              <span className="text-sm text-[#4f5f90]">
                Use 2-80 characters with letters, spaces, apostrophes, periods, or hyphens.
              </span>
            </label>
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
                placeholder="Create a strong password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
              <span className="text-sm text-[#4f5f90]">
                Password must be at least 8 characters.
              </span>
            </label>
            <button
              className="mt-1 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-[var(--accent-ink)] disabled:opacity-70"
              type="submit"
              disabled={pending}
            >
              {pending ? "Creating..." : "Create account"}
            </button>
          </form>

          {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <p className="mt-5 text-base text-[#24335f]">
            Already have an account?{" "}
            <Link className="font-semibold underline" href="/auth/login">
              Login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
