"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CompletionResponse = {
  message?: string;
  devPhoneCode?: string;
  requiresPhoneVerification?: boolean;
};

type CurrentUser = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressCity?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type MeResponse = {
  user?: CurrentUser;
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pendingToken = useMemo(() => searchParams.get("pending") || "", [searchParams]);
  const nextPath = useMemo(() => {
    const target = String(searchParams.get("next") || "/menu");
    return target.startsWith("/") ? target : "/menu";
  }, [searchParams]);
  const emailHint = useMemo(() => String(searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [devPhoneCode, setDevPhoneCode] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const firstNameIsValid = firstName.trim().length >= 2;
  const lastNameIsValid = lastName.trim().length >= 2;
  const phoneIsValid = /^[1-9][0-9]{4,10}$/.test(phoneLocal);
  const addressLineIsValid = addressLine1.trim().length >= 3;
  const cityIsValid = addressCity.trim().length >= 2;

  function borderColorClass(isValid: boolean) {
    return isValid ? "border-[#2ea44f]" : "border-[#d14343]";
  }

  function bottomLineClass(isValid: boolean) {
    return isValid ? "shadow-[0_3px_0_#2ea44f]" : "shadow-[0_3px_0_#d14343]";
  }

  useEffect(() => {
    if (emailHint) {
      setEmail(emailHint);
    }
  }, [emailHint]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUserProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as MeResponse;
        const user = payload.user;
        if (!user || cancelled) {
          return;
        }

        setFirstName(String(user.firstName || ""));
        setLastName(String(user.lastName || ""));
        setEmail(String(user.email || ""));

        const phoneValue = String(user.phone || "");
        if (phoneValue.startsWith("+358")) {
          setPhoneLocal(phoneValue.slice(4).replace(/\D+/g, "").slice(0, 11));
        }

        setAddressLine1(String(user.addressLine1 || ""));
        setAddressCity(String(user.addressCity || ""));
      } catch {
        // Ignore profile prefill failures and keep manual entry path available.
      } finally {
        if (!cancelled) {
          setProfileLoaded(true);
        }
      }
    }

    void loadCurrentUserProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstNameIsValid || !lastNameIsValid || !phoneIsValid || !addressLineIsValid || !cityIsValid) {
      setError("Please fill all required fields with valid values.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const body = {
        pendingToken: pendingToken || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `+358${phoneLocal}`,
        addressLine1: addressLine1.trim(),
        addressCity: addressCity.trim(),
      };

      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as CompletionResponse;

      if (!response.ok) {
        setError(payload.message || "Could not complete profile.");
        return;
      }

      setDevPhoneCode(payload.devPhoneCode || "");
      if (payload.requiresPhoneVerification) {
        router.push(`/auth/verify-phone?next=${encodeURIComponent(nextPath)}${payload.devPhoneCode ? `&devCode=${encodeURIComponent(payload.devPhoneCode)}` : ""}`);
      } else {
        router.push(nextPath);
      }
      router.refresh();
    } catch {
      setError("Unable to save profile right now.");
    } finally {
      setPending(false);
    }
  }

  function handleBackdropClose() {
    if (pending) {
      return;
    }
    router.push(nextPath);
  }

  return (
    <main
      className="min-h-screen bg-[linear-gradient(150deg,#f7f3ea_0%,#efe9dc_48%,#f8f5ee_100%)] px-0 py-0 flex items-end sm:items-center sm:justify-center sm:px-6 sm:py-8"
      onClick={handleBackdropClose}
    >
      <section
        className="gt-auth-sheet gt-auth-sheet-no-topfx relative mx-auto w-full max-w-xl rounded-t-[24px] border-x-[3px] border-t-[3px] border-[#1f1f1f] bg-[#f6f1e7] p-5 pb-7 shadow-none sm:rounded-[20px] sm:border-[3px] sm:p-7 sm:shadow-[8px_8px_0_#1f1f1f]"
        onClick={(event) => event.stopPropagation()}
      >
          <h1 className="text-3xl font-extrabold text-[#1f1f1f]">Complete Profile</h1>

          <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[#1f1f1f]">
                Email <span className="font-semibold text-red-700">*</span>
              </span>
              <input
                className="rounded-lg border-2 border-[#2ea44f] bg-[#f2eee6] px-3 py-2 text-sm text-[#4c4538] shadow-[0_3px_0_#2ea44f] outline-none focus:outline-none focus-visible:outline-none"
                type="email"
                value={email}
                placeholder="Email"
                readOnly
                aria-readonly="true"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[#1f1f1f]">
                First name <span className="font-semibold text-red-700">*</span>
              </span>
              <input
                className={`rounded-lg border bg-[#fffdf7] px-3 py-2 text-sm text-[#1f1f1f] placeholder:text-[#6a6254] outline-none focus:outline-none focus-visible:outline-none ${borderColorClass(firstNameIsValid)} ${bottomLineClass(firstNameIsValid)}`}
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[#1f1f1f]">
                Last name <span className="font-semibold text-red-700">*</span>
              </span>
              <input
                className={`rounded-lg border bg-[#fffdf7] px-3 py-2 text-sm text-[#1f1f1f] placeholder:text-[#6a6254] outline-none focus:outline-none focus-visible:outline-none ${borderColorClass(lastNameIsValid)} ${bottomLineClass(lastNameIsValid)}`}
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[#1f1f1f]">
                Phone number <span className="font-semibold text-red-700">*</span>
              </span>
              <div
                className={`flex items-center overflow-hidden rounded-lg border bg-[#fffdf7] ${borderColorClass(phoneIsValid)} ${bottomLineClass(phoneIsValid)}`}
              >
                <span className={`border-r px-3 py-2 text-sm font-semibold text-[#1f1f1f] ${borderColorClass(phoneIsValid)}`}>+358</span>
                <input
                  className="w-full bg-[#fffdf7] px-3 py-2 text-sm text-[#1f1f1f] placeholder:text-[#6a6254] outline-none focus:outline-none focus-visible:outline-none"
                  type="text"
                  inputMode="numeric"
                  placeholder="401234567"
                  value={phoneLocal}
                  onChange={(event) => setPhoneLocal(event.target.value.replace(/\D+/g, "").slice(0, 11))}
                  pattern="[1-9][0-9]{4,10}"
                  title="Enter Finnish number digits after +358 (no leading 0)."
                  minLength={5}
                  maxLength={11}
                  required
                />
              </div>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[#1f1f1f]">
                Address line 1 <span className="font-semibold text-red-700">*</span>
              </span>
              <input
                className={`rounded-lg border bg-[#fffdf7] px-3 py-2 text-sm text-[#1f1f1f] placeholder:text-[#6a6254] outline-none focus:outline-none focus-visible:outline-none ${borderColorClass(addressLineIsValid)} ${bottomLineClass(addressLineIsValid)}`}
                type="text"
                placeholder="Street and number"
                value={addressLine1}
                onChange={(event) => setAddressLine1(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[#1f1f1f]">
                City <span className="font-semibold text-red-700">*</span>
              </span>
              <input
                className={`rounded-lg border bg-[#fffdf7] px-3 py-2 text-sm text-[#1f1f1f] placeholder:text-[#6a6254] outline-none focus:outline-none focus-visible:outline-none ${borderColorClass(cityIsValid)} ${bottomLineClass(cityIsValid)}`}
                type="text"
                placeholder="City"
                value={addressCity}
                onChange={(event) => setAddressCity(event.target.value)}
                required
              />
            </label>
            <button
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving..." : "Save and Continue"}
            </button>
          </form>

          {!profileLoaded ? <p className="mt-4 text-xs text-[#5d5648]">Loading saved details...</p> : null}
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
          {devPhoneCode ? <p className="mt-4 text-xs text-[#1f1f1f]">Dev verification code: {devPhoneCode}</p> : null}

      </section>
    </main>
  );
}

