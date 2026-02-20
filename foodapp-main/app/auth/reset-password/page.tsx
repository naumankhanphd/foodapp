"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type ResetResponse = {
  message?: string;
};

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const tokenFromQuery = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json()) as ResetResponse;
      if (!response.ok) {
        setError(payload.message || "Could not reset password.");
        return;
      }

      setMessage(payload.message || "Password reset complete.");
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
          <p className="badge">Password Reset</p>
          <h1 className="mt-3 text-3xl">Set New Password</h1>

          <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="text"
              placeholder="Reset token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="password"
              placeholder="New password (min 8 chars)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            <button
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
              type="submit"
              disabled={pending}
            >
              {pending ? "Updating..." : "Reset password"}
            </button>
          </form>

          {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

          <p className="mt-4 text-sm">
            Go to <Link className="font-semibold underline" href="/auth/login">login</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
