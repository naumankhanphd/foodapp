"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GoogleAuthButton } from "@/components/google-auth-button";

type ApiError = {
  message?: string;
};

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.message || "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export default function StaffLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
          requiredRole: "ADMIN",
        }),
      });

      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }

      router.push("/staff");
      router.refresh();
    } catch {
      setError("Unable to reach authentication service.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          fullName: googleName,
          requiredRole: "ADMIN",
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
        router.push(`/auth/complete-profile?pending=${encodeURIComponent(payload.pendingToken)}&next=${encodeURIComponent("/staff")}`);
        return;
      }

      router.push("/staff");
      router.refresh();
    } catch {
      setError("Unable to reach authentication service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="py-6 sm:py-10">
      <div className="shell">
        <section className="panel mx-auto max-w-md p-5 sm:p-7">
          <p className="badge">Admin</p>
          <h1 className="mt-3 text-3xl">Admin Login</h1>

          <form className="mt-5 grid gap-3" onSubmit={handlePasswordLogin}>
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
              type="submit"
              disabled={pending}
            >
              {pending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <form className="mt-6 grid gap-3" onSubmit={handleGoogleLogin}>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Google Admin Sign-In (Mock)</h2>
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="email"
              placeholder="Google email"
              value={googleEmail}
              onChange={(event) => setGoogleEmail(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="text"
              placeholder="Full name"
              value={googleName}
              onChange={(event) => setGoogleName(event.target.value)}
              required
            />
            <GoogleAuthButton type="submit" disabled={pending} className="mt-0 text-sm" />
          </form>

          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

          <p className="mt-4 text-sm">
            Need an account?{" "}
            <Link className="font-semibold underline" href="/auth/signup">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
