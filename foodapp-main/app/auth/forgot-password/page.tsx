"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ForgotResponse = {
  message?: string;
  devResetToken?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devResetToken, setDevResetToken] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as ForgotResponse;
      if (!response.ok) {
        setError(payload.message || "Could not submit request.");
        return;
      }

      setMessage(payload.message || "If the email exists, a reset link has been sent.");
      setDevResetToken(payload.devResetToken || "");
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
          <h1 className="mt-3 text-3xl">Forgot Password</h1>

          <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="email"
              placeholder="Account email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
              type="submit"
              disabled={pending}
            >
              {pending ? "Submitting..." : "Send reset link"}
            </button>
          </form>

          {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {devResetToken ? (
            <p className="mt-3 text-xs">
              Dev reset token: {devResetToken}. Open{" "}
              <Link className="font-semibold underline" href={`/auth/reset-password?token=${encodeURIComponent(devResetToken)}`}>
                reset page
              </Link>
              .
            </p>
          ) : null}

          <p className="mt-4 text-sm">
            Back to <Link className="font-semibold underline" href="/auth/login">login</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
