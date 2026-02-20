type GoogleAuthButtonProps = {
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
};

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5"
      viewBox="0 0 24 24"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6.1-2.8-6.1-6.2s2.8-6.2 6.1-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.8 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4 9.6-9.7 0-.6-.1-1.2-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M2 12c0 5.5 4.5 10 10 10 2.7 0 4.9-.9 6.6-2.4l-3.1-2.4c-.8.6-1.9 1-3.5 1-2.6 0-4.8-1.7-5.6-4.1H2z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1V7.5H2.9C2.3 8.8 2 10.4 2 12s.3 3.2.9 4.5l3.5-2.4z"
      />
      <path
        fill="#4285F4"
        d="M12 5.8c2 0 3.3.9 4.1 1.6l3-2.9C17.5 2.9 15.3 2 12 2 6.5 2 2 6.5 2 12c0 1.6.3 3.2.9 4.5l3.5-2.4c.8-2.4 3-4.1 5.6-4.1z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  type = "button",
  disabled = false,
  onClick,
  label = "Continue with Google",
  className = "",
}: GoogleAuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-3 text-base font-semibold text-[#3c4043] shadow-[0_1px_2px_rgba(60,64,67,0.15)] transition-colors hover:bg-[#f8f9fa] hover:border-[#c6c9cc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4285f4]/40 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}

