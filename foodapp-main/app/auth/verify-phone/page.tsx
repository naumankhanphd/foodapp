"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type ApiPayload = {
  message?: string;
  devPhoneCode?: string;
};

export default function VerifyPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => searchParams.get("next") || "/checkout", [searchParams]);
  const devCodeFromQuery = useMemo(() => searchParams.get("devCode") || "", [searchParams]);

  const [code, setCode] = useState(devCodeFromQuery);
  const [devCode, setDevCode] = useState(devCodeFromQuery);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function sendCode() {
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/phone/send-code", {
        method: "POST",
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) {
        setError(payload.message || "Could not send verification code.");
        return;
      }

      if (payload.devPhoneCode) {
        setDevCode(payload.devPhoneCode);
      }
      setMessage("Verification code sent.");
    } catch {
      setError("Unable to reach authentication service.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) {
        setError(payload.message || "Could not verify code.");
        return;
      }

      router.push(nextPath);
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
          <p className="badge">Phone Verification</p>
          <h1 className="mt-3 text-3xl">Verify Your Phone</h1>
          <p className="mt-2 text-sm">Checkout and order tracking require a verified phone number.</p>

          <button
            type="button"
            className="mt-5 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
            onClick={sendCode}
            disabled={pending}
          >
            Send verification code
          </button>

          <form className="mt-4 grid gap-3" onSubmit={verifyCode}>
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <button
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
              type="submit"
              disabled={pending}
            >
              Verify
            </button>
          </form>

          {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {devCode ? <p className="mt-3 text-xs">Dev verification code: {devCode}</p> : null}

          <p className="mt-4 text-sm">
            Back to <Link className="font-semibold underline" href="/auth/login">login</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
