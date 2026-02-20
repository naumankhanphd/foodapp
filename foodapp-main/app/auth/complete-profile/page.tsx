"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type CompletionResponse = {
  message?: string;
  devPhoneCode?: string;
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pendingToken = useMemo(() => searchParams.get("pending") || "", [searchParams]);
  const nextPath = useMemo(() => searchParams.get("next") || "/menu", [searchParams]);

  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [devPhoneCode, setDevPhoneCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingToken) {
      setError("Missing pending token. Start Google login again.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingToken,
          phone,
          addressLine1,
          addressCity,
          lat: Number(lat),
          lng: Number(lng),
        }),
      });

      const payload = (await response.json()) as CompletionResponse;

      if (!response.ok) {
        setError(payload.message || "Could not complete profile.");
        return;
      }

      setDevPhoneCode(payload.devPhoneCode || "");
      router.push(`/auth/verify-phone?next=${encodeURIComponent(nextPath)}${payload.devPhoneCode ? `&devCode=${encodeURIComponent(payload.devPhoneCode)}` : ""}`);
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
        <section className="panel mx-auto max-w-lg p-5 sm:p-7">
          <p className="badge">Google Completion</p>
          <h1 className="mt-3 text-3xl">Complete Required Profile Fields</h1>
          <p className="mt-2 text-sm">Phone, address, and location are mandatory before checkout access is enabled.</p>

          <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="text"
              placeholder="Phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="text"
              placeholder="Address line"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              required
            />
            <input
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
              type="text"
              placeholder="City"
              value={addressCity}
              onChange={(event) => setAddressCity(event.target.value)}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
                type="number"
                placeholder="Latitude"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                step="any"
                required
              />
              <input
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
                type="number"
                placeholder="Longitude"
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                step="any"
                required
              />
            </div>
            <button
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving..." : "Save and Continue"}
            </button>
          </form>

          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
          {devPhoneCode ? <p className="mt-4 text-xs">Dev verification code: {devPhoneCode}</p> : null}

          <p className="mt-4 text-sm">
            Back to <Link className="font-semibold underline" href="/auth/login">login</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
