/**
 * TEMPORARY — /allcards
 * Card-style showcase. Real item data pulled directly from the DB.
 * Delete when a final card style has been chosen.
 */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { listPublicMenuFromDb } from "../../lib/menu/drizzle-menu.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceEntry {
  /** Display label, e.g. "Large" / "Family" — empty string for single-price items */
  label: string;
  /** Formatted amount, e.g. "€12,90" */
  amount: string;
}

interface CardItem {
  name: string;
  description: string;
  shortDesc: string;
  /** One entry for regular items, two+ for dual-price items (pizza sizes) */
  prices: PriceEntry[];
  tag: string;
  emoji: string;
  category: string;
  imageUrl: string | null;
  focalX: number;
  focalY: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickEmoji(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("kebab"))  return "🥙";
  if (c.includes("pizza"))  return "🍕";
  if (c.includes("burger")) return "🍔";
  if (c.includes("salad"))  return "🥗";
  if (c.includes("drink"))  return "🥤";
  if (c.includes("side") || c.includes("fries")) return "🍟";
  if (c.includes("soup"))   return "🍲";
  return "🍽️";
}

function shortDesc(description: string): string {
  if (!description) return "";
  return description.length > 72 ? description.slice(0, 69) + "…" : description;
}

// Gradient fallback when no real image exists
const GRADIENTS: Record<string, string> = {
  kebab:  "from-orange-300 via-amber-200 to-yellow-100",
  pizza:  "from-red-300 via-orange-200 to-amber-100",
  burger: "from-yellow-300 via-amber-200 to-orange-100",
  salad:  "from-green-300 via-emerald-200 to-teal-100",
  drink:  "from-sky-300 via-blue-200 to-indigo-100",
  default:"from-orange-200 via-amber-100 to-yellow-50",
};

function gradientFor(category: string): string {
  const c = category.toLowerCase();
  for (const [key, val] of Object.entries(GRADIENTS)) {
    if (c.includes(key)) return val;
  }
  return GRADIENTS.default;
}

/** Formats a number as Finnish euro style: comma decimal, no thousands sep. */
function formatEuro(value: number) {
  return value.toFixed(2).replace(".", ",");
}

/** Derives a PriceEntry array from listPublicMenuFromDb item data. */
type DbItem = Awaited<ReturnType<typeof listPublicMenuFromDb>>["items"][number];
function buildPrices(item: DbItem): PriceEntry[] {
  // Required single-select modifier group = size picker (pizza Large / Family)
  const sizeGroup = item.modifierGroups.find(
    (g) => g.isRequired && g.minSelect === 1 && g.maxSelect === 1 && g.options.length > 1,
  );
  if (sizeGroup) {
    return sizeGroup.options
      .filter((o) => o.isActive)
      .map((o) => ({
        label:  o.name,
        amount: `€${formatEuro(item.basePrice + o.priceDelta)}`,
      }));
  }
  return [{ label: "", amount: `€${formatEuro(item.basePrice)}` }];
}

/**
 * PriceDisplay — matches the menu page's price rendering exactly.
 *
 * • Single price          →  "€12,90"
 * • Multi-price, default  →  "Price from €12,90"   (customer-facing, like PriceText)
 * • Multi-price, stacked  →  two stacked lines      (like admin PriceBadge)
 */
function PriceDisplay({
  prices,
  stacked = false,
}: {
  prices: PriceEntry[];
  stacked?: boolean;
}) {
  if (prices.length === 1) return <>{prices[0].amount}</>;

  if (stacked) {
    return (
      <span className="inline-flex flex-col">
        <span className="block whitespace-nowrap leading-tight">{prices[0].amount}</span>
        <span className="mt-0.5 block whitespace-nowrap text-[0.72em] leading-tight opacity-70">
          {prices[1]?.amount}
        </span>
      </span>
    );
  }

  // Default customer view — matches PriceText in menu-sections.tsx
  return <>Price from {prices[0].amount}</>;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

// ImgBlock always creates a `relative overflow-hidden` wrapper so that the img
// can be positioned `absolute inset-0` — this reliably fills the container
// regardless of whether the parent height comes from an explicit class, flex
// stretch, or grid stretch.  Callers must not pass `absolute` in className
// (those cards handle their layout inline — see C03, C08).
function ImgBlock({
  item,
  className,
}: {
  item: CardItem;
  className?: string;
}) {
  if (item.imageUrl) {
    return (
      <div className={`relative overflow-hidden ${className ?? ""}`}>
        <img
          src={item.imageUrl}
          alt={item.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
        />
      </div>
    );
  }
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${gradientFor(item.category)} ${className ?? ""}`}
    >
      <span className="relative select-none text-5xl">{item.emoji}</span>
    </div>
  );
}

// CutoutImgBlock is tuned for photos where the subject background is already
// removed (transparent PNG/WebP). A multiply blend mode helps hide any light
// matte edges from auto-cutout tools while keeping the stage pure white.
function CutoutImgBlock({ item, className }: { item: CardItem; className?: string }) {
  if (item.imageUrl) {
    return (
      <div className={`relative overflow-hidden bg-white ${className ?? ""}`}>
        <img
          src={item.imageUrl}
          alt={item.name}
          className="absolute inset-0 h-full w-full object-cover p-1.5"
          style={{
            objectPosition: `${item.focalX}% ${item.focalY}%`,
            mixBlendMode: "multiply",
          }}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-white ${className ?? ""}`}>
      <span className="relative select-none text-5xl">{item.emoji}</span>
    </div>
  );
}

function AddBtn({ accent = "#f97316", ink = "#fff" }: { accent?: string; ink?: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg font-black transition-transform hover:scale-110 active:scale-95"
      style={{ background: accent, color: ink }}
    >
      +
    </button>
  );
}

function Stepper({
  qty = 2,
  accent = "#f97316",
  ink = "#fff",
}: {
  qty?: number;
  accent?: string;
  ink?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border px-1 py-1"
      style={{ borderColor: accent }}
    >
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-black"
        style={{ borderColor: accent, color: accent }}
      >
        −
      </button>
      <span
        className="min-w-[1.6rem] text-center text-xs font-extrabold"
        style={{ color: accent }}
      >
        {qty}
      </span>
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black"
        style={{ background: accent, color: ink }}
      >
        +
      </button>
    </div>
  );
}

function Label({ n, name }: { n: number; name: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-black text-[0.65rem] font-black text-white">
        {n}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">{name}</span>
    </div>
  );
}

// ─── 30 Card styles ───────────────────────────────────────────────────────────

function C01_Current({ item }: { item: CardItem }) {
  return (
    <article className="relative flex flex-col rounded-[12px] border-2 border-[#2d1d13] bg-[#fff7ea] shadow-[3px_3px_0_0_#2d1d13]">
      <div className="grid grid-cols-[minmax(0,1fr)_132px] items-start gap-2 p-3">
        <div className="order-1 min-w-0 grid min-h-[96px] grid-rows-[auto_1fr_auto] gap-1">
          <h2 className="truncate text-[0.92rem] font-extrabold text-[#1a0a00]">{item.name}</h2>
          <p className="line-clamp-2 text-[0.8rem] leading-snug text-[#8b5a2b]">{item.shortDesc}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#1a0a00]"><PriceDisplay prices={item.prices} stacked /></span>
            <Stepper />
          </div>
        </div>
        <ImgBlock
          item={item}
          className="order-2 h-[96px] rounded-lg border-2 border-[#2d1d13]"
        />
      </div>
    </article>
  );
}

function C02_Stacked({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <ImgBlock item={item} className="h-44 w-full" />
      <div className="p-4">
        <span className="mb-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-orange-600">
          {item.category}
        </span>
        <h2 className="mb-1 text-base font-extrabold text-gray-900">{item.name}</h2>
        <p className="mb-3 text-xs leading-relaxed text-gray-500">{item.shortDesc}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-black text-gray-900"><PriceDisplay prices={item.prices} /></span>
          <AddBtn />
        </div>
      </div>
    </article>
  );
}

function C03_Overlay({ item }: { item: CardItem }) {
  return (
    <article className="relative h-56 overflow-hidden rounded-2xl shadow-lg">
      {/* Background layer — inline so we can use absolute without conflicting with ImgBlock's relative wrapper */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradientFor(item.category)}`}>
          <span className="select-none text-7xl">{item.emoji}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="mb-0.5 text-[0.65rem] font-bold uppercase tracking-widest text-orange-300">
          {item.category}
        </p>
        <h2 className="mb-2 text-base font-extrabold text-white">{item.name}</h2>
        <div className="flex items-center justify-between">
          <span className="text-lg font-black text-white"><PriceDisplay prices={item.prices} /></span>
          <AddBtn accent="#f97316" />
        </div>
      </div>
    </article>
  );
}

function C04_MinimalList({ item }: { item: CardItem }) {
  return (
    <article className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
          />
        ) : (
          <span className="text-xl">{item.emoji}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-bold text-gray-900">{item.name}</h2>
        <p className="truncate text-xs text-gray-400">{item.shortDesc}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-extrabold text-gray-900"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="rounded-full bg-orange-500 px-3 py-0.5 text-[0.65rem] font-black text-white">
          ADD
        </button>
      </div>
    </article>
  );
}

function C05_DarkWarm({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-[#1a0a00] shadow-xl">
      <ImgBlock item={item} className="h-36 w-full" />
      <div className="p-4">
        <span className="mb-1 inline-block text-[0.65rem] font-bold uppercase tracking-widest text-orange-400">
          {item.category}
        </span>
        <h2 className="mb-1 text-base font-extrabold text-white">{item.name}</h2>
        <p className="mb-3 line-clamp-2 text-xs text-stone-400">{item.shortDesc}</p>
        <div className="flex items-center justify-between border-t border-stone-700 pt-3">
          <span className="text-xl font-black text-orange-400"><PriceDisplay prices={item.prices} /></span>
          <Stepper qty={2} accent="#f97316" ink="#fff" />
        </div>
      </div>
    </article>
  );
}

function C06_NeonNight({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-xl border border-emerald-400/30 bg-[#060f0f] shadow-[0_0_24px_rgba(52,211,153,0.15)]">
      <div className="flex items-center gap-3 p-4">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-emerald-400/30">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-emerald-300">{item.name}</h2>
          <p className="truncate text-[0.7rem] text-emerald-600">{item.shortDesc}</p>
        </div>
      </div>
      <div className="mx-4 h-px bg-emerald-900" />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-mono text-lg font-black text-emerald-400"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="rounded-md border border-emerald-500 px-4 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-900">
          + ADD
        </button>
      </div>
    </article>
  );
}

function C07_RetroDiner({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-none border-4 border-red-600 bg-white" style={{ fontFamily: "Georgia, serif" }}>
      <div className="relative h-36 bg-red-600">
        <ImgBlock item={item} className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 h-4 bg-white" style={{ clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }} />
      </div>
      <div className="px-4 pb-4 pt-2">
        <div className="mb-1 border-b-2 border-dashed border-red-600" />
        <h2 className="mt-2 text-lg font-black uppercase tracking-tight text-red-700">{item.name}</h2>
        <p className="mb-3 text-xs italic text-gray-500">{item.shortDesc}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-black text-red-600"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="border-2 border-red-600 px-4 py-1.5 text-xs font-black uppercase text-red-600 transition-colors hover:bg-red-600 hover:text-white">
            Order Now
          </button>
        </div>
      </div>
    </article>
  );
}

function C08_Luxury({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-xl bg-gradient-to-b from-emerald-950 to-teal-950 shadow-2xl">
      <div className="relative h-40">
        {/* Inline absolute image — avoids relative/absolute conflict with ImgBlock */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
          />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradientFor(item.category)} opacity-60`}>
            <span className="select-none text-6xl">{item.emoji}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 to-transparent" />
        <div className="absolute right-3 top-3 rounded-full border border-yellow-400/50 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-yellow-400">
          {item.category}
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="mb-3 mt-1 h-px bg-yellow-400/30" />
        <h2 className="mb-1 text-base font-bold tracking-wide text-yellow-100">{item.name}</h2>
        <p className="mb-4 text-xs leading-relaxed text-teal-400/70">{item.shortDesc}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold tracking-wide text-yellow-400"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="rounded-full border border-yellow-400/60 px-5 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-300 transition-colors hover:bg-yellow-400/10">
            Reserve
          </button>
        </div>
      </div>
    </article>
  );
}

function C09_PastelPop({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-pink-200 bg-gradient-to-br from-pink-50 to-fuchsia-50 shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-fuchsia-400">{item.category}</span>
          <h2 className="text-sm font-extrabold text-gray-800">{item.name}</h2>
          <p className="mt-0.5 line-clamp-2 text-[0.72rem] text-gray-400">{item.shortDesc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="rounded-full bg-fuchsia-100 px-3 py-1">
          <span className="text-sm font-black text-fuchsia-600"><PriceDisplay prices={item.prices} /></span>
        </div>
        <Stepper qty={2} accent="#d946ef" ink="#fff" />
      </div>
    </article>
  );
}

function C10_Brutalist({ item }: { item: CardItem }) {
  return (
    <article className="border-4 border-black bg-yellow-300 shadow-[6px_6px_0_0_#000]">
      <div className="h-36 border-b-4 border-black">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="p-3">
        <h2 className="mb-1 text-lg font-black uppercase">{item.name}</h2>
        <p className="mb-3 text-xs font-medium">{item.shortDesc}</p>
        <div className="flex items-center justify-between">
          <span className="border-2 border-black bg-black px-3 py-1 text-base font-black text-yellow-300"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="border-2 border-black bg-white px-4 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none">
            ADD +
          </button>
        </div>
      </div>
    </article>
  );
}

function C11_Glass({ item }: { item: CardItem }) {
  return (
    <article className="relative overflow-hidden rounded-2xl shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/60 via-amber-300/40 to-yellow-200/60 blur-xl" />
      <div className="relative rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-md">
        <div className="mb-3 h-32 w-full overflow-hidden rounded-xl border border-white/30">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <h2 className="mb-1 text-sm font-extrabold text-white drop-shadow">{item.name}</h2>
        <p className="mb-3 text-[0.72rem] text-white/70">{item.shortDesc}</p>
        <div className="flex items-center justify-between rounded-xl bg-white/30 px-3 py-2 backdrop-blur-sm">
          <span className="text-base font-black text-white drop-shadow"><PriceDisplay prices={item.prices} /></span>
          <AddBtn accent="rgba(255,255,255,0.9)" ink="#f97316" />
        </div>
      </div>
    </article>
  );
}

function C12_Polaroid({ item }: { item: CardItem }) {
  return (
    <div className="mx-auto max-w-[230px] -rotate-1 bg-white p-3 pb-8 shadow-2xl shadow-neutral-400/60">
      <div className="h-44 w-full overflow-hidden bg-white">
        <CutoutImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="pt-3 text-center">
        <h2 className="text-base font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
        <p className="mt-0.5 text-[0.65rem] italic text-gray-400">{item.shortDesc}</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-sm font-black text-gray-700"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="rounded-full bg-orange-500 px-3 py-1 text-[0.65rem] font-black text-white">Add</button>
        </div>
      </div>
    </div>
  );
}

function C13_Magazine({ item }: { item: CardItem }) {
  return (
    <article className="bg-white" style={{ fontFamily: "Georgia, serif" }}>
      <div className="relative h-48 overflow-hidden">
        <ImgBlock item={item} className="h-full w-full" />
        <div className="absolute left-4 top-4 bg-black px-3 py-1">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white">{item.category}</span>
        </div>
      </div>
      <div className="p-5">
        <h2 className="mb-2 text-2xl font-bold leading-tight text-gray-900">{item.name}</h2>
        <div className="mb-3 h-px bg-gray-200" />
        <p className="mb-4 text-xs uppercase leading-loose tracking-wide text-gray-500">{item.shortDesc}</p>
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold text-gray-900"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="flex-1 bg-gray-900 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-gray-700">
            Add to Order
          </button>
        </div>
      </div>
    </article>
  );
}

function C14_MenuBoard({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-xl border-2 border-yellow-500/30 bg-[#0d0d0d] p-4 font-mono">
      <div className="mb-3 flex items-center justify-between border-b border-yellow-500/20 pb-3">
        <span className="text-[0.6rem] uppercase tracking-[0.3em] text-yellow-500/60">TODAY&apos;S SPECIAL</span>
        <span className="text-[0.6rem] uppercase tracking-widest text-yellow-500/40">{item.category}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div>
          <h2 className="text-base font-bold uppercase tracking-widest text-yellow-300">{item.name}</h2>
          <p className="text-[0.65rem] text-yellow-600/70">{item.shortDesc}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-[0.6rem] uppercase tracking-widest text-yellow-600/50">Price</div>
          <span className="text-2xl font-black text-yellow-400"><PriceDisplay prices={item.prices} /></span>
        </div>
        <button type="button" className="border border-yellow-500/40 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400 transition-colors hover:bg-yellow-400/10">
          ORDER
        </button>
      </div>
    </article>
  );
}

function C15_Social({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-lg">
      <div className="relative aspect-square w-full">
        <ImgBlock item={item} className="h-full w-full" />
        <div className="absolute right-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[0.65rem] font-black text-white shadow">
          <PriceDisplay prices={item.prices} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-gray-900">{item.name}</h2>
            <p className="text-[0.72rem] text-gray-400">{item.shortDesc}</p>
          </div>
          <button type="button" className="ml-2 flex-shrink-0 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-black text-white shadow">
            +
          </button>
        </div>
      </div>
    </article>
  );
}

function C16_Comic({ item }: { item: CardItem }) {
  return (
    <article className="relative overflow-hidden rounded-xl border-[3px] border-black bg-sky-100 shadow-[5px_5px_0_0_#000]">
      <div className="relative h-32 overflow-hidden border-b-[3px] border-black">
        <ImgBlock item={item} className="h-full w-full" />
        {/* Speech bubble price */}
        <div className="absolute right-2 top-2 rounded-xl border-[2px] border-black bg-yellow-300 px-2 py-1 text-xs font-black shadow-[2px_2px_0_0_#000]">
          <PriceDisplay prices={item.prices} />
        </div>
      </div>
      <div className="p-3">
        <h2 className="text-base font-black uppercase">{item.name}</h2>
        <p className="mt-0.5 text-[0.7rem]">{item.shortDesc}</p>
        <button type="button" className="mt-3 w-full border-[2px] border-black bg-orange-400 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none">
          ADD TO CART!
        </button>
      </div>
    </article>
  );
}

function C17_Neumorphic({ item }: { item: CardItem }) {
  return (
    <article
      className="rounded-2xl p-4"
      style={{ background: "#e8e0d5", boxShadow: "8px 8px 16px rgba(0,0,0,0.15),-8px -8px 16px rgba(255,255,255,0.8)" }}
    >
      <div
        className="mb-4 h-36 w-full overflow-hidden rounded-xl"
        style={{ boxShadow: "inset 4px 4px 10px rgba(0,0,0,0.12),inset -4px -4px 10px rgba(255,255,255,0.7)" }}
      >
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <h2 className="mb-1 text-sm font-extrabold text-stone-700">{item.name}</h2>
      <p className="mb-3 text-[0.72rem] leading-relaxed text-stone-400">{item.shortDesc}</p>
      <div className="flex items-center justify-between">
        <span className="text-base font-black text-stone-700"><PriceDisplay prices={item.prices} /></span>
        <button
          type="button"
          className="h-10 w-10 rounded-full text-lg font-black text-orange-500"
          style={{ background: "#e8e0d5", boxShadow: "4px 4px 8px rgba(0,0,0,0.12),-4px -4px 8px rgba(255,255,255,0.7)" }}
        >
          +
        </button>
      </div>
    </article>
  );
}

function C18_RecipeCard({ item }: { item: CardItem }) {
  return (
    <article
      className="rounded-lg bg-amber-50 p-4 shadow"
      style={{
        backgroundImage: "repeating-linear-gradient(transparent,transparent 28px,#d4b483 28px,#d4b483 29px)",
        backgroundPositionY: "32px",
      }}
    >
      <h2 className="mb-1 text-base font-extrabold text-amber-900" style={{ fontFamily: "Georgia, serif" }}>
        {item.name}
      </h2>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <span className="text-[0.72rem] italic text-amber-700">{item.shortDesc}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-amber-600">{item.category} · ~25 min</p>
        <span className="rounded bg-amber-800 px-2 py-0.5 text-xs font-black text-amber-100"><PriceDisplay prices={item.prices} /></span>
      </div>
      <button type="button" className="mt-3 w-full rounded border border-amber-400 bg-amber-200 py-1.5 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-300">
        Add to Order
      </button>
    </article>
  );
}

function C19_PriceTag({ item }: { item: CardItem }) {
  return (
    <article className="relative overflow-visible rounded-xl border-2 border-neutral-200 bg-white p-3 shadow">
      <div className="absolute -top-5 right-5 flex flex-col items-center">
        <div className="h-5 w-px bg-neutral-400" />
        <div className="rounded-md border-2 border-neutral-400 bg-orange-500 px-2.5 py-1 shadow">
          <span className="text-xs font-black text-white"><PriceDisplay prices={item.prices} /></span>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-gray-900">{item.name}</h2>
          <p className="text-[0.7rem] text-gray-500">{item.shortDesc}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Stepper qty={2} />
      </div>
    </article>
  );
}

function C20_WideBanner({ item }: { item: CardItem }) {
  return (
    <article className="flex overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md" style={{ minHeight: 120 }}>
      <div className="w-36 flex-shrink-0 sm:w-48">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <span className="mb-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-orange-600">
            {item.category}
          </span>
          <h2 className="text-sm font-extrabold text-gray-900">{item.name}</h2>
          <p className="mt-0.5 line-clamp-2 text-[0.72rem] text-gray-400">{item.description}</p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-black text-gray-900"><PriceDisplay prices={item.prices} /></span>
          <Stepper qty={2} />
        </div>
      </div>
    </article>
  );
}

function C21_CircleImage({ item }: { item: CardItem }) {
  return (
    <article className="flex flex-col items-center rounded-2xl border border-neutral-100 bg-white px-4 pb-4 pt-6 text-center shadow-md">
      <div className="mb-3 h-24 w-24 overflow-hidden rounded-full border-4 border-orange-200 shadow-lg">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <span className="mb-1 text-[0.6rem] font-bold uppercase tracking-widest text-orange-400">{item.category}</span>
      <h2 className="mb-1 text-sm font-extrabold text-gray-900">{item.name}</h2>
      <p className="mb-3 text-[0.72rem] text-gray-400">{item.shortDesc}</p>
      <div className="flex w-full items-center justify-between rounded-xl bg-orange-50 px-4 py-2">
        <span className="text-base font-black text-orange-600"><PriceDisplay prices={item.prices} /></span>
        <AddBtn />
      </div>
    </article>
  );
}

function C22_HighContrast({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-lg border-2 border-black bg-white">
      <div className="flex">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="flex-1 border-l-2 border-black p-3">
          <h2 className="text-sm font-black uppercase text-black">{item.name}</h2>
          <p className="mt-0.5 text-[0.7rem] text-gray-600">{item.shortDesc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t-2 border-black bg-black px-3 py-2">
        <span className="text-base font-black text-white"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="rounded bg-white px-4 py-1 text-xs font-black text-black transition-colors hover:bg-gray-100">
          ADD →
        </button>
      </div>
    </article>
  );
}

function C23_MinimalMono({ item }: { item: CardItem }) {
  return (
    <article className="border-b border-neutral-300 bg-neutral-50 px-5 py-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-2xl font-black tracking-tighter text-neutral-900">{item.name}</h2>
        <span className="ml-4 flex-shrink-0 text-xl font-black text-neutral-900"><PriceDisplay prices={item.prices} /></span>
      </div>
      <p className="mb-4 text-xs uppercase tracking-widest text-neutral-400">{item.shortDesc}</p>
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-widest text-neutral-300">{item.category}</span>
        <button type="button" className="text-xs font-bold uppercase tracking-widest text-neutral-600 underline underline-offset-4 transition-colors hover:text-black">
          Add to cart
        </button>
      </div>
    </article>
  );
}

function C24_Festival({ item }: { item: CardItem }) {
  return (
    <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-0.5 shadow-xl">
      <div className="rounded-2xl bg-[#13001a] p-4">
        <div className="mb-3 h-32 overflow-hidden rounded-xl">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="mb-3 flex items-center gap-3">
          <div>
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-fuchsia-400">{item.category}</span>
            <h2 className="text-sm font-extrabold text-white">{item.name}</h2>
          </div>
        </div>
        <p className="mb-3 text-[0.72rem] text-white/50">{item.shortDesc}</p>
        <div className="flex items-center justify-between">
          <span className="bg-gradient-to-r from-fuchsia-400 to-orange-400 bg-clip-text text-xl font-black text-transparent">
            <PriceDisplay prices={item.prices} />
          </span>
          <button type="button" className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2 text-xs font-black text-white shadow-lg">
            + Order
          </button>
        </div>
      </div>
    </article>
  );
}

function C25_NightMarket({ item }: { item: CardItem }) {
  const BULB_COLORS = ["#f97316","#eab308","#22c55e","#3b82f6","#a855f7","#ec4899"] as const;
  return (
    <article className="relative overflow-hidden rounded-2xl bg-[#1a0f00] px-4 pb-4 pt-5">
      <div className="absolute inset-x-0 top-0 flex justify-around px-2">
        {BULB_COLORS.map((color, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-3 w-px bg-amber-700" />
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          </div>
        ))}
      </div>
      <div className="mt-4 mb-3 h-32 overflow-hidden rounded-xl">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <h2 className="mb-1 text-sm font-extrabold text-amber-200">{item.name}</h2>
      <p className="mb-3 text-[0.7rem] text-amber-700/70">{item.shortDesc}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-black text-amber-400"><PriceDisplay prices={item.prices} /></span>
        <Stepper qty={2} accent="#f59e0b" ink="#1a0f00" />
      </div>
    </article>
  );
}

function C26_SplitTinted({ item }: { item: CardItem }) {
  return (
    <article className="grid grid-cols-2 overflow-hidden rounded-xl shadow-lg" style={{ minHeight: 160 }}>
      <div className="col-span-1 flex flex-col justify-between bg-orange-500 p-4">
        <span className="text-[0.6rem] font-bold uppercase tracking-widest text-orange-100">{item.category}</span>
        <div>
          <h2 className="text-base font-extrabold leading-tight text-white">{item.name}</h2>
          <p className="mt-1 text-[0.7rem] text-orange-200">{item.shortDesc}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-black text-white"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-500">+</button>
        </div>
      </div>
      <div className="col-span-1 overflow-hidden">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
    </article>
  );
}

function C27_Outlined({ item }: { item: CardItem }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border-2 border-orange-300 bg-white p-4 transition-all hover:border-orange-500 hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full border border-orange-200 px-2.5 py-0.5 text-[0.65rem] font-bold text-orange-500">{item.category}</span>
      </div>
      <div className="mb-3 h-28 overflow-hidden rounded-xl border border-orange-100">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <h2 className="mb-1 text-sm font-extrabold text-gray-900">{item.name}</h2>
      <p className="mb-3 text-[0.72rem] text-gray-400">{item.shortDesc}</p>
      <div className="flex items-center justify-between">
        <span className="text-base font-black text-orange-500"><PriceDisplay prices={item.prices} /></span>
        <Stepper qty={2} />
      </div>
    </article>
  );
}

function C28_Compact({ item }: { item: CardItem }) {
  return (
    <article className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[0.8rem] font-extrabold text-gray-900">{item.name}</h2>
        <span className="text-[0.7rem] font-bold text-orange-500"><PriceDisplay prices={item.prices} /></span>
      </div>
      <Stepper qty={2} />
    </article>
  );
}

function C29_Stripe({ item }: { item: CardItem }) {
  return (
    <article className="overflow-hidden rounded-xl bg-white shadow">
      <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
      <div className="flex items-start gap-3 p-4">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-gray-900">{item.name}</h2>
          <p className="mt-0.5 text-[0.72rem] text-gray-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-black text-gray-900"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-black text-white shadow-sm transition-colors hover:bg-orange-600">
              Add
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function C30_Pill({ item }: { item: CardItem }) {
  return (
    <article className="flex items-center gap-3 rounded-full border-2 border-orange-200 bg-white py-2 pl-2 pr-4 shadow-sm">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-orange-300">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[0.8rem] font-extrabold text-gray-900">{item.name}</h2>
        <span className="text-[0.7rem] font-bold text-orange-500"><PriceDisplay prices={item.prices} /></span>
      </div>
      <button type="button" className="flex-shrink-0 rounded-full bg-orange-500 p-2 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" strokeWidth={2.5} fill="none">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </article>
  );
}

// ─── Polaroid colour variants (C31–C35) ───────────────────────────────────────

/** Warm orange mat + hard brutalist shadow */
function C31_PolaroidWarm({ item }: { item: CardItem }) {
  return (
    <div className="mx-auto max-w-[220px] -rotate-1 bg-orange-50 p-3 pb-8 shadow-[6px_6px_0_0_#f97316]">
      <div className="h-40 w-full overflow-hidden border-2 border-orange-200">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="pt-3 text-center">
        <h2 className="text-base font-bold text-orange-900" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
        <p className="mt-0.5 text-[0.65rem] italic text-orange-400">{item.shortDesc}</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-sm font-black text-orange-700"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="bg-orange-500 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#c2410c]">Add</button>
        </div>
      </div>
    </div>
  );
}

/** Dark moody mat + violet brutalist shadow */
function C32_PolaroidDark({ item }: { item: CardItem }) {
  return (
    <div className="mx-auto max-w-[220px] rotate-2 bg-neutral-900 p-3 pb-8 shadow-[6px_6px_0_0_#7c3aed]">
      <div className="h-40 w-full overflow-hidden ring-1 ring-neutral-700">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="pt-3 text-center">
        <h2 className="text-base font-bold text-neutral-100" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
        <p className="mt-0.5 text-[0.65rem] italic text-neutral-500">{item.shortDesc}</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-sm font-black text-violet-400"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="bg-violet-600 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#4c1d95]">Add</button>
        </div>
      </div>
    </div>
  );
}

/** Stacked back layers — mint green, offset three deep like a real stack */
function C33_PolaroidMint({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px]">
      {/* Two back layers */}
      <div className="absolute inset-0 translate-x-4 translate-y-3 rotate-[4deg] bg-emerald-300" />
      <div className="absolute inset-0 translate-x-2 translate-y-1.5 rotate-[2deg] bg-emerald-100" />
      {/* Front card */}
      <div className="relative -rotate-1 bg-white p-3 pb-8 shadow-md">
        <div className="h-40 w-full overflow-hidden">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-gray-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-emerald-700"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="rounded-full bg-emerald-500 px-3 py-1 text-[0.65rem] font-black text-white">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Sky blue tinted mat — two vivid back layers + hard shadow */
function C34_PolaroidSky({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px]">
      <div className="absolute inset-0 translate-x-4 translate-y-2 rotate-[5deg] bg-sky-400" />
      <div className="absolute inset-0 translate-x-2 translate-y-1 rotate-[2deg] bg-sky-200" />
      <div className="relative bg-sky-50 p-3 pb-8 shadow-[4px_4px_0_0_#0284c7]">
        <div className="h-40 w-full overflow-hidden border border-sky-200">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-sky-900" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-sky-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-sky-700"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="rounded-full bg-sky-500 px-3 py-1 text-[0.65rem] font-black text-white">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hot pink retro mat + big brutalist back shadow */
function C35_PolaroidRetro({ item }: { item: CardItem }) {
  return (
    <div className="mx-auto max-w-[220px] rotate-1 bg-pink-100 p-3 pb-8 shadow-[8px_8px_0_0_#be185d]">
      <div className="h-40 w-full overflow-hidden border-2 border-pink-300">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="pt-3 text-center">
        <h2 className="text-base font-bold text-pink-900" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
        <p className="mt-0.5 text-[0.65rem] italic text-pink-400">{item.shortDesc}</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-sm font-black text-pink-700"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="bg-pink-600 px-3 py-1 text-[0.65rem] font-black text-white shadow-[3px_3px_0_0_#831843]">Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── More card ideas (C36–C43) ────────────────────────────────────────────────

/** Polaroid pinned with masking-tape strip at top */
function C36_PolaroidTaped({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px] pt-4">
      {/* Tape */}
      <div className="absolute left-1/2 top-0 z-10 h-7 w-14 -translate-x-1/2 -rotate-2 rounded-sm bg-amber-200/80 shadow-sm" />
      <div className="rotate-1 bg-white p-3 pb-8 shadow-[2px_8px_24px_rgba(0,0,0,0.25)]">
        <div className="h-40 w-full overflow-hidden">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-gray-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-gray-700"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="rounded-full bg-orange-500 px-3 py-1 text-[0.65rem] font-black text-white">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Thermal receipt / order ticket */
function C37_Receipt({ item }: { item: CardItem }) {
  return (
    <article className="mx-auto max-w-[260px] bg-[#fffdf7] shadow-[0_2px_12px_rgba(0,0,0,0.12)]" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-dashed border-gray-200 px-4 py-3 text-center">
        <div className="text-[0.6rem] uppercase tracking-[0.25em] text-gray-400">★ ORDER TICKET ★</div>
        <div className="text-[0.55rem] text-gray-300">{item.category}</div>
      </div>
      <div className="mx-4 my-3 h-20 overflow-hidden">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="border-t border-dashed border-gray-200 px-4 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-gray-800">{item.name}</span>
          <span className="text-xs font-black text-gray-900"><PriceDisplay prices={item.prices} /></span>
        </div>
        <p className="mt-0.5 text-[0.6rem] text-gray-400">{item.shortDesc}</p>
      </div>
      <div className="mx-4 mt-2 border-t-2 border-dashed border-gray-300 pb-4 pt-2">
        <button type="button" className="w-full bg-gray-900 py-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-white">
          ADD TO ORDER
        </button>
      </div>
    </article>
  );
}

/** iOS App Store card — full bleed image, frosted glass bottom panel */
function C38_AppStore({ item }: { item: CardItem }) {
  return (
    <article className="relative overflow-hidden rounded-[20px] shadow-2xl" style={{ minHeight: 220 }}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }} />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradientFor(item.category)}`}>
          <span className="select-none text-8xl">{item.emoji}</span>
        </div>
      )}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 backdrop-blur-xl"
        style={{ background: "rgba(20,20,20,0.55)", borderTop: "1px solid rgba(255,255,255,0.15)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/60">{item.category}</p>
            <h2 className="text-sm font-bold text-white">{item.name}</h2>
            <p className="truncate text-[0.65rem] text-white/50">{item.shortDesc}</p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <span className="text-sm font-black text-white"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="rounded-full bg-white/90 px-4 py-1 text-xs font-black text-gray-900">GET</button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Boarding pass / event ticket with perforated stub */
function C39_BoardingPass({ item }: { item: CardItem }) {
  return (
    <article className="flex overflow-hidden rounded-xl bg-white shadow-xl" style={{ minHeight: 110 }}>
      <div className="w-2 flex-shrink-0 bg-orange-500" />
      <div className="flex flex-1 items-stretch">
        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-gray-300">{item.category}</p>
            <h2 className="text-sm font-black text-gray-900">{item.name}</h2>
            <p className="mt-0.5 text-[0.65rem] text-gray-400">{item.shortDesc}</p>
          </div>
          <span className="mt-2 text-xl font-black text-orange-500"><PriceDisplay prices={item.prices} /></span>
        </div>
        {/* Perforated divider */}
        <div className="flex flex-col justify-center py-0">
          <div className="h-full border-l-2 border-dashed border-gray-200" />
        </div>
        {/* Stub */}
        <div className="flex w-20 flex-shrink-0 flex-col items-center justify-center gap-2 p-2">
          <div className="h-14 w-14 overflow-hidden rounded-lg">
            <ImgBlock item={item} className="h-full w-full" />
          </div>
          <button type="button" className="rounded bg-orange-500 px-2 py-1 text-[0.6rem] font-black text-white">ADD</button>
        </div>
      </div>
    </article>
  );
}

/** Chalkboard — dark slate, chalk-style typography */
function C40_Chalkboard({ item }: { item: CardItem }) {
  return (
    <article
      className="rounded-lg bg-[#2a3530] p-4"
      style={{ fontFamily: "Georgia, serif", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />
        <span className="text-[0.6rem] uppercase tracking-widest text-amber-300/60">{item.category}</span>
      </div>
      <h2 className="mb-1 text-xl font-bold text-amber-50" style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.6)" }}>{item.name}</h2>
      <p className="mb-3 text-[0.72rem] italic text-green-200/50">{item.shortDesc}</p>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg opacity-80 ring-1 ring-white/10">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="flex-1">
          <div className="mb-2 border-t border-dashed border-white/20" />
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-200"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="rounded border border-white/30 px-3 py-1 text-xs font-bold text-white/80 transition-colors hover:bg-white/10">
              Order
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Sticky note / Post-it */
function C41_StickyNote({ item }: { item: CardItem }) {
  return (
    <div
      className="relative px-5 pb-8 pt-4"
      style={{
        fontFamily: "Georgia, serif",
        background: "linear-gradient(to bottom right, #fef08a 88%, #fde047 88%)",
        boxShadow: "4px 4px 14px rgba(0,0,0,0.22), -1px -1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div className="mb-3 h-px bg-yellow-300/60" />
      <div className="mb-3 flex items-center gap-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded shadow-sm">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-yellow-900">{item.name}</h2>
          <p className="text-[0.65rem] text-yellow-700">{item.shortDesc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-black text-yellow-900"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="rounded bg-orange-400 px-3 py-1 text-xs font-black text-white shadow">Add ✓</button>
      </div>
    </div>
  );
}

/** Trading card / Pokémon-style with holographic shimmer border */
function C42_TradingCard({ item }: { item: CardItem }) {
  return (
    <article
      className="relative mx-auto max-w-[220px] overflow-hidden rounded-2xl bg-gradient-to-b from-orange-100 to-amber-50 p-2"
      style={{ border: "3px solid #fbbf24", boxShadow: "0 0 18px rgba(251,191,36,0.4), 0 4px 16px rgba(0,0,0,0.12)" }}
    >
      {/* Shimmer overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[0.55rem] font-black uppercase tracking-widest text-amber-600">{item.category}</span>
        <span className="text-[0.65rem] font-black text-amber-600"><PriceDisplay prices={item.prices} /></span>
      </div>
      <div className="h-36 overflow-hidden rounded-xl border-2 border-yellow-300">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="my-1.5 rounded-md bg-gradient-to-r from-orange-400 to-amber-400 px-2 py-0.5">
        <h2 className="text-sm font-black uppercase text-white">{item.name}</h2>
      </div>
      <p className="mb-2 text-[0.62rem] italic text-gray-500">{item.shortDesc}</p>
      <button type="button" className="w-full rounded-xl bg-amber-400 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-sm">
        + Add to Order
      </button>
    </article>
  );
}

/** Instagram / TikTok story — tall 9:16 ratio, full bleed */
function C43_StorySlide({ item }: { item: CardItem }) {
  return (
    <article className="relative mx-auto max-w-[220px] overflow-hidden rounded-2xl shadow-2xl" style={{ aspectRatio: "9/16", maxHeight: 390 }}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }} />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradientFor(item.category)}`}>
          <span className="select-none text-8xl">{item.emoji}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
      <div className="absolute left-3 top-3 rounded-full bg-white/20 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
        {item.category}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h2 className="mb-1 text-lg font-black text-white">{item.name}</h2>
        <p className="mb-3 text-xs text-white/70">{item.shortDesc}</p>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-white"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="flex-1 rounded-full bg-orange-500 py-2 text-sm font-black text-white shadow-lg">
            Order Now
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── C46–C49: More tape variants ──────────────────────────────────────────────

/** Two diagonal corner mount tapes (top-left + top-right), amber back layers */
function C46_TapedDualCorner({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px] pt-6">
      {/* Back layers */}
      <div className="absolute inset-x-0 bottom-0 top-6 translate-x-3 translate-y-2 rotate-[3deg] bg-amber-300" />
      <div className="absolute inset-x-0 bottom-0 top-6 translate-x-1.5 translate-y-1 rotate-[1.5deg] bg-amber-100" />
      {/* Corner mount tapes */}
      <div className="absolute left-3 top-2 z-20 h-4 w-9 -rotate-45 rounded-sm bg-yellow-200/90 shadow-sm" />
      <div className="absolute right-3 top-2 z-20 h-4 w-9 rotate-45 rounded-sm bg-yellow-200/90 shadow-sm" />
      {/* Front card */}
      <div className="relative bg-white p-3 pb-8 shadow-[3px_3px_0_0_#92400e]">
        <div className="h-40 w-full overflow-hidden border border-stone-200">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-stone-800" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-stone-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-stone-700"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="bg-amber-600 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#92400e]">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full-width washi tape across top edge, rose/coral theme */
function C47_TapedWashi({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px] pt-5">
      {/* Back layers */}
      <div className="absolute inset-x-0 bottom-0 top-5 translate-x-3 translate-y-2 rotate-[3deg] bg-rose-300" />
      <div className="absolute inset-x-0 bottom-0 top-5 translate-x-1.5 translate-y-1 rotate-[1.5deg] bg-rose-200" />
      {/* Full-width washi tape */}
      <div className="absolute inset-x-0 top-0 z-20 h-5 -rotate-1 rounded-sm bg-rose-400/70" />
      {/* Front card */}
      <div className="relative bg-rose-50 p-3 pb-8 shadow-[4px_4px_0_0_#be123c]">
        <div className="h-40 w-full overflow-hidden border-2 border-rose-200">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-rose-900" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-rose-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-rose-700"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="bg-rose-500 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#9f1239]">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Vertical tape straps on left + right sides, red back layers */
function C48_TapedSideStraps({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px]">
      {/* Back layers */}
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[4deg] bg-red-300" />
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[2deg] bg-red-100" />
      {/* Left strap */}
      <div className="absolute -left-1 top-5 z-20 h-14 w-4 -rotate-3 rounded-sm bg-amber-200/80 shadow-sm" />
      {/* Right strap */}
      <div className="absolute -right-1 top-5 z-20 h-14 w-4 rotate-3 rounded-sm bg-amber-200/80 shadow-sm" />
      {/* Front card */}
      <div className="relative bg-white p-3 pb-8 shadow-[4px_4px_0_0_#dc2626]">
        <div className="h-40 w-full overflow-hidden">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-gray-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-red-700"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="bg-red-500 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#991b1b]">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Single diagonal tape sealing the top-left corner, kraft paper body, navy back layers */
function C49_TapedDiagonal({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px]">
      {/* Back layers */}
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[4deg] bg-blue-900" />
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[2deg] bg-blue-700" />
      {/* Diagonal tape strip across top-left corner */}
      <div className="absolute -left-3 top-8 z-20 h-5 w-20 -rotate-45 rounded-sm bg-amber-200/80 shadow-sm" />
      {/* Front card */}
      <div className="relative bg-[#f5e6c8] p-3 pb-8 shadow-[4px_4px_0_0_#1e3a5f]">
        <div className="h-40 w-full overflow-hidden border border-amber-200">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-amber-900" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-amber-700">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-amber-800"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="bg-blue-800 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#1e3a5f]">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── C44–C45: Tape + stacked + coloured body ──────────────────────────────────

/** Tape top + two back layers + warm orange body + brutalist button */
function C44_TapedStackWarm({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px] pt-5">
      {/* Back layers — anchored from same top as front card */}
      <div className="absolute inset-x-0 bottom-0 top-5 translate-x-4 translate-y-3 rotate-[4deg] bg-orange-300" />
      <div className="absolute inset-x-0 bottom-0 top-5 translate-x-2 translate-y-1.5 rotate-[2deg] bg-orange-100" />
      {/* Tape — rendered on top of everything */}
      <div className="absolute left-1/2 top-0 z-20 h-6 w-14 -translate-x-1/2 -rotate-2 rounded-sm bg-amber-200/80 shadow-sm" />
      {/* Front card */}
      <div className="relative -rotate-3 bg-orange-50 p-3 pb-8 shadow-[4px_4px_0_0_#f97316]">
        <div className="h-40 w-full overflow-hidden border-2 border-orange-200">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-orange-900" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-orange-400">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-orange-700"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="bg-orange-500 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#c2410c]">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tape top + two back layers + dark moody body + violet brutalist button */
function C45_TapedStackDark({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[220px] pt-5">
      {/* Back layers */}
      <div className="absolute inset-x-0 bottom-0 top-5 translate-x-4 translate-y-3 rotate-[4deg] bg-violet-800" />
      <div className="absolute inset-x-0 bottom-0 top-5 translate-x-2 translate-y-1.5 rotate-[2deg] bg-violet-600" />
      {/* Tape */}
      <div className="absolute left-1/2 top-0 z-20 h-6 w-14 -translate-x-1/2 rotate-1 rounded-sm bg-neutral-300/70 shadow-sm" />
      {/* Front card */}
      <div className="relative rotate-1 bg-neutral-900 p-3 pb-8 shadow-[4px_4px_0_0_#7c3aed]">
        <div className="h-40 w-full overflow-hidden ring-1 ring-neutral-700">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="pt-3 text-center">
          <h2 className="text-base font-bold text-neutral-100" style={{ fontFamily: "Georgia, serif" }}>{item.name}</h2>
          <p className="mt-0.5 text-[0.65rem] italic text-neutral-500">{item.shortDesc}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-sm font-black text-violet-400"><PriceDisplay prices={item.prices} /></span>
            <button type="button" className="bg-violet-600 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#4c1d95]">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── C50–C55: Fresh concepts ──────────────────────────────────────────────────

/** American diner — laminated red/white feel */
function C50_Diner({ item }: { item: CardItem }) {
  return (
    <div className="overflow-hidden border-[3px] border-red-600 bg-white shadow-md" style={{ fontFamily: "Georgia, serif" }}>
      <div className="flex items-center justify-between bg-red-600 px-3 py-1.5">
        <span className="text-[0.55rem] font-black uppercase tracking-widest text-white">Today&apos;s Special</span>
        <span className="text-sm font-black text-white"><PriceDisplay prices={item.prices} /></span>
      </div>
      <div className="relative h-36">
        <ImgBlock item={item} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
      <div className="border-t-2 border-dashed border-red-200 px-3 py-2">
        <h2 className="text-sm font-black uppercase tracking-tight text-red-900">{item.name}</h2>
        <p className="mt-0.5 line-clamp-2 text-[0.65rem] italic text-red-400">{item.shortDesc}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[0.6rem] font-bold uppercase tracking-widest text-red-300">Order now</span>
          <button type="button" className="rounded-sm bg-red-600 px-3 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#991b1b]">Add +</button>
        </div>
      </div>
    </div>
  );
}

/** Newspaper clipping — broadsheet column style */
function C51_Newspaper({ item }: { item: CardItem }) {
  return (
    <div className="border border-[#c8b89a] bg-[#f4eed8] p-3 shadow-sm" style={{ fontFamily: "Georgia, serif" }}>
      <div className="mb-2 border-b-2 border-t-2 border-[#1a1a1a] py-1 text-center">
        <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-[#1a1a1a]">The Daily Menu</p>
      </div>
      <h2 className="text-lg font-black uppercase leading-tight text-[#1a1a1a]">{item.name}</h2>
      <div className="mt-1.5 flex gap-2">
        <div className="h-20 w-20 shrink-0 overflow-hidden border border-[#c8b89a]">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <p className="flex-1 text-[0.65rem] leading-[1.35] text-[#3a3020] line-clamp-4">{item.description || item.shortDesc}</p>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-[#c8b89a] pt-2">
        <span className="text-sm font-black text-[#1a1a1a]"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="border border-[#1a1a1a] px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-[#1a1a1a]">Order</button>
      </div>
    </div>
  );
}

/** Price tag — hang tag with hole + barcode */
function C52_PriceTag({ item }: { item: CardItem }) {
  return (
    <div className="relative mx-auto max-w-[180px]">
      <div className="flex justify-center"><div className="h-5 w-px bg-neutral-400" /></div>
      <div className="border-2 border-neutral-800 bg-white shadow-[4px_4px_0_0_#1a1a1a]">
        <div className="flex justify-center pt-2">
          <div className="h-4 w-4 rounded-full border-2 border-neutral-800 bg-neutral-100" />
        </div>
        <div className="mx-2 mt-2 h-28 overflow-hidden border border-neutral-200">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        <div className="px-3 py-2 text-center" style={{ fontFamily: "Georgia, serif" }}>
          <h2 className="text-sm font-black uppercase leading-tight tracking-tight text-neutral-900">{item.name}</h2>
          <div className="mt-2 inline-block bg-neutral-900 px-3 py-1">
            <span className="text-base font-black text-white"><PriceDisplay prices={item.prices} /></span>
          </div>
          <button type="button" className="mt-2 block w-full bg-neutral-900 py-1.5 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#555]">Add to Order</button>
        </div>
        <div className="flex justify-center gap-px pb-2">
          {Array.from({ length: 22 }).map((_, i) => (
            <div key={i} className="bg-neutral-800" style={{ width: i % 3 === 0 ? 2 : 1, height: i % 5 === 0 ? 14 : 9 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Film negative — sprocket strip */
function C53_FilmStrip({ item }: { item: CardItem }) {
  const holes = Array.from({ length: 6 });
  return (
    <div className="overflow-hidden rounded-sm bg-[#111]" style={{ fontFamily: "monospace" }}>
      <div className="flex justify-around bg-[#0a0a0a] py-1.5">
        {holes.map((_, i) => <div key={i} className="h-3 w-3 rounded-[2px] border border-[#444] bg-[#2a2a2a]" />)}
      </div>
      <div className="mx-2 my-1 h-36 overflow-hidden ring-2 ring-[#333]">
        <ImgBlock item={item} className="h-full w-full opacity-90" />
      </div>
      <div className="px-3 pb-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[0.55rem] font-bold tracking-widest text-orange-400">▶ 24A</span>
          <span className="text-[0.55rem] uppercase tracking-wide text-neutral-500">{item.category}</span>
        </div>
        <h2 className="mt-1 line-clamp-1 text-sm font-bold leading-tight text-white">{item.name}</h2>
        <p className="mt-0.5 line-clamp-1 text-[0.6rem] italic text-neutral-500">{item.shortDesc}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-black text-orange-400"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="bg-orange-500 px-2.5 py-1 text-[0.6rem] font-black text-black">+ ADD</button>
        </div>
      </div>
      <div className="flex justify-around bg-[#0a0a0a] py-1.5">
        {holes.map((_, i) => <div key={i} className="h-3 w-3 rounded-[2px] border border-[#444] bg-[#2a2a2a]" />)}
      </div>
    </div>
  );
}

/** Neon sign — dark bg with glowing text */
function C54_NeonSign({ item }: { item: CardItem }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#1a1a3a] bg-[#07071a] p-3">
      <div className="relative h-36 overflow-hidden rounded-sm">
        <ImgBlock item={item} className="h-full w-full brightness-75" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07071a]/80 to-transparent" />
      </div>
      <div className="mt-3 text-center">
        <h2 className="line-clamp-2 text-base font-black leading-tight text-white"
          style={{ textShadow: "0 0 8px #f472b6, 0 0 20px #f472b6, 0 0 40px #f472b6" }}>{item.name}</h2>
        <p className="mt-1 text-[0.65rem] text-neutral-500">{item.shortDesc}</p>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-sm font-black"
            style={{ color: "#4ade80", textShadow: "0 0 8px #4ade80, 0 0 20px #4ade80" }}>
            <PriceDisplay prices={item.prices} />
          </span>
          <button type="button" className="rounded-sm px-3 py-1 text-[0.65rem] font-black"
            style={{ border: "1px solid #38bdf8", color: "#38bdf8", boxShadow: "0 0 8px #38bdf8, inset 0 0 8px #38bdf822", textShadow: "0 0 6px #38bdf8" }}>
            ORDER
          </button>
        </div>
      </div>
    </div>
  );
}

/** Matchbox label — vintage sliding box art */
function C55_Matchbox({ item }: { item: CardItem }) {
  return (
    <div className="overflow-hidden shadow-[4px_4px_0_0_#1a1a1a]">
      {/* Label top stripe */}
      <div className="bg-[#1a1a1a] px-3 py-1 flex items-center justify-between">
        <span className="text-[0.55rem] font-black uppercase tracking-[0.15em] text-amber-400">Est. 1987</span>
        <span className="text-[0.55rem] font-black uppercase tracking-[0.15em] text-amber-400">No. 1</span>
      </div>
      {/* Main label */}
      <div className="relative bg-amber-50 border-x-4 border-[#1a1a1a]">
        <div className="h-36 overflow-hidden">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
        {/* Diagonal name banner */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a]/85 px-2 py-1.5">
          <h2 className="text-center text-sm font-black uppercase tracking-widest text-amber-400 line-clamp-1">{item.name}</h2>
        </div>
      </div>
      {/* Strike strip bottom */}
      <div className="bg-[#1a1a1a] px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-black text-amber-400"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="bg-amber-400 px-3 py-1 text-[0.65rem] font-black text-[#1a1a1a] shadow-[2px_2px_0_0_#92400e]">Add</button>
      </div>
    </div>
  );
}

/** Night Market v2 — no image, coloured category banner, hard amber shadow */
function C56_NightMarketDark({ item }: { item: CardItem }) {
  function bannerCls(cat: string) {
    const c = cat.toLowerCase();
    if (c.includes("pizza"))  return "bg-red-600 text-white";
    if (c.includes("kebab"))  return "bg-amber-500 text-neutral-950";
    if (c.includes("burger")) return "bg-yellow-400 text-neutral-950";
    if (c.includes("salaat") || c.includes("salad")) return "bg-emerald-500 text-white";
    return "bg-orange-500 text-white";
  }
  function emoji(cat: string) {
    const c = cat.toLowerCase();
    if (c.includes("pizza"))  return "🍕";
    if (c.includes("kebab"))  return "🥙";
    if (c.includes("burger")) return "🍔";
    if (c.includes("salaat") || c.includes("salad")) return "🥗";
    if (c.includes("drink"))  return "🥤";
    return "🍽️";
  }
  return (
    <div className="overflow-hidden bg-neutral-950 shadow-[4px_4px_0_0_#f59e0b]">
      <div className={`flex items-center justify-between px-3 py-2 ${bannerCls(item.category)}`}>
        <span className="text-[0.58rem] font-black uppercase tracking-widest">{item.category}</span>
        <span className="text-base leading-none">{emoji(item.category)}</span>
      </div>
      <div className="px-3 pt-4 pb-5 text-center" style={{ fontFamily: "Georgia, serif" }}>
        <h2 className="line-clamp-2 text-base font-black leading-tight text-neutral-100">{item.name}</h2>
        <p className="mt-1.5 line-clamp-2 text-[0.65rem] italic leading-snug text-neutral-500">{item.shortDesc}</p>
        <div className="mt-4 flex items-center justify-between gap-1">
          <span className="text-sm font-black text-amber-400"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="bg-amber-500 px-2.5 py-1 text-[0.65rem] font-black text-neutral-950 shadow-[2px_2px_0_0_#000]">Add</button>
        </div>
      </div>
    </div>
  );
}

/** Night Market v3 — no image, neon cyan glow, deep dark bg */
function C57_NightMarketNeon({ item }: { item: CardItem }) {
  return (
    <div className="relative overflow-hidden bg-[#05080f] p-4" style={{ boxShadow: "0 0 0 1px #0e2a3a, 4px 4px 0 0 #06b6d4" }}>
      {/* Neon divider with category */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, #06b6d4)" }} />
        <span className="text-[0.58rem] font-black uppercase tracking-widest text-cyan-500">{item.category}</span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, #06b6d4)" }} />
      </div>
      <h2
        className="line-clamp-2 text-center text-base font-black leading-tight text-white"
        style={{ fontFamily: "Georgia, serif", textShadow: "0 0 18px #06b6d4, 0 0 36px #06b6d460" }}
      >
        {item.name}
      </h2>
      <p className="mt-2 line-clamp-2 text-center text-[0.65rem] italic text-cyan-900">{item.shortDesc}</p>
      <div className="mt-1 h-px" style={{ background: "linear-gradient(to right, transparent, #06b6d4, transparent)" }} />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-black text-cyan-400" style={{ textShadow: "0 0 8px #06b6d4" }}>
          <PriceDisplay prices={item.prices} />
        </span>
        <button type="button" className="border border-cyan-500 px-2.5 py-1 text-[0.65rem] font-black text-cyan-400" style={{ boxShadow: "0 0 8px #06b6d430, 2px 2px 0 0 #06b6d4" }}>Add</button>
      </div>
    </div>
  );
}

/** Night Market v4 — no image, warm lantern strings, deep wood-dark bg */
function C58_NightMarketLantern({ item }: { item: CardItem }) {
  const bulbs = ["#f97316","#eab308","#ef4444","#f97316","#eab308","#a855f7"];
  return (
    <div className="overflow-hidden bg-[#130a00]" style={{ boxShadow: "0 0 0 1px #7c3b0c, 4px 4px 0 0 #7c3b0c" }}>
      {/* Lantern string */}
      <div className="flex items-end gap-1 bg-[#0d0600] px-3 py-1.5">
        {bulbs.map((c, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-2 w-px bg-orange-900" />
            <div className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 5px ${c}` }} />
          </div>
        ))}
        <div className="flex-1" />
        <span className="text-[0.55rem] font-bold uppercase tracking-widest text-orange-800">{item.category}</span>
      </div>
      <div className="px-4 pt-5 pb-4 text-center" style={{ fontFamily: "Georgia, serif" }}>
        <h2 className="line-clamp-2 text-base font-black leading-tight text-amber-200">{item.name}</h2>
        <p className="mt-1.5 line-clamp-2 text-[0.65rem] italic text-orange-900/70">{item.shortDesc}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-black text-amber-400"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="bg-orange-600 px-2.5 py-1 text-[0.65rem] font-black text-white shadow-[2px_2px_0_0_#7c2d12]">Add</button>
        </div>
      </div>
    </div>
  );
}

/** Night Market v5 — no image, chalkboard, sketchy border */
function C59_NightMarketChalk({ item }: { item: CardItem }) {
  return (
    <div
      className="relative bg-[#1c2b1c] p-4"
      style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.12), 4px 4px 0 0 #0d160d" }}
    >
      <div className="mb-3 text-center">
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.3em] text-white/35">{item.category}</span>
        <div className="mt-1 h-px bg-white/15" />
      </div>
      <h2
        className="line-clamp-2 text-center text-base font-black leading-tight text-white/90"
        style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', cursive", textShadow: "1px 1px 0 rgba(255,255,255,0.1)" }}
      >
        {item.name}
      </h2>
      <p className="mt-2 line-clamp-2 text-center text-[0.65rem] italic text-white/35">{item.shortDesc}</p>
      <div className="mt-3 h-px bg-white/15" />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-black text-white/80"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="border border-white/25 px-2.5 py-1 text-[0.65rem] font-black text-white/70 shadow-[2px_2px_0_0_rgba(255,255,255,0.1)]">Add</button>
      </div>
    </div>
  );
}

// ─── Sticky Note variants ─────────────────────────────────────────────────────

/** Sticky note — pink, no-image, handwritten, slight tilt */
function C60_StickyPink({ item }: { item: CardItem }) {
  return (
    <div
      className="relative px-4 pb-5 pt-3"
      style={{
        fontFamily: "'Segoe Print', 'Comic Sans MS', cursive",
        background: "linear-gradient(to bottom right, #fce7f3 88%, #fbcfe8 88%)",
        boxShadow: "3px 3px 10px rgba(0,0,0,0.18), -1px -1px 3px rgba(0,0,0,0.05)",
        transform: "rotate(-1.5deg)",
      }}
    >
      <div className="mb-2 h-px bg-pink-200" />
      <span className="text-[0.55rem] font-bold uppercase tracking-widest text-pink-400">{item.category}</span>
      <h2 className="mt-1 text-base font-black leading-tight text-pink-900">{item.name}</h2>
      <p className="mt-1 line-clamp-2 text-[0.65rem] italic text-pink-700/80">{item.shortDesc}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-black text-pink-900"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="rounded bg-pink-500 px-2.5 py-1 text-[0.6rem] font-black text-white shadow-sm">Add ✓</button>
      </div>
    </div>
  );
}

/** Sticky note — sky-blue stack, three layers like polaroid */
function C61_StickyStack({ item }: { item: CardItem }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-sky-300" style={{ transform: "translateX(7px) translateY(6px) rotate(3.5deg)" }} />
      <div className="absolute inset-0 bg-sky-200" style={{ transform: "translateX(3px) translateY(3px) rotate(1.5deg)" }} />
      <div
        className="relative px-4 pb-5 pt-3"
        style={{
          fontFamily: "'Segoe Print', 'Comic Sans MS', cursive",
          background: "#bfdbfe",
          boxShadow: "3px 3px 10px rgba(0,0,0,0.18)",
        }}
      >
        <div className="mb-2 h-px bg-blue-300/60" />
        <span className="text-[0.55rem] font-bold uppercase tracking-widest text-blue-400">{item.category}</span>
        <h2 className="mt-1 text-base font-black leading-tight text-blue-900">{item.name}</h2>
        <p className="mt-1 line-clamp-2 text-[0.65rem] italic text-blue-700/80">{item.shortDesc}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-black text-blue-900"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="rounded bg-blue-500 px-2.5 py-1 text-[0.6rem] font-black text-white shadow-sm">Add ✓</button>
        </div>
      </div>
    </div>
  );
}

/** Sticky note — green ruled lines, slight tilt opposite way */
function C62_StickyRuled({ item }: { item: CardItem }) {
  return (
    <div
      className="relative overflow-hidden px-4 pb-5 pt-3"
      style={{
        fontFamily: "Georgia, serif",
        background: "#bbf7d0",
        boxShadow: "4px 4px 14px rgba(0,0,0,0.2)",
        transform: "rotate(1deg)",
      }}
    >
      {[0,1,2,3,4].map(i => (
        <div key={i} className="absolute left-0 right-0 h-px bg-green-300/50" style={{ top: `${44 + i * 18}px` }} />
      ))}
      <div className="relative">
        <span className="text-[0.55rem] font-bold uppercase tracking-widest text-green-600/80">{item.category}</span>
        <h2 className="mt-0.5 text-base font-black leading-tight text-green-900">{item.name}</h2>
        <p className="mt-1 line-clamp-3 text-[0.65rem] text-green-800/80">{item.shortDesc}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-black text-green-900"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="rounded bg-green-600 px-2.5 py-1 text-[0.6rem] font-black text-white">Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── Newspaper variants ────────────────────────────────────────────────────────

/** Newspaper — bold broadsheet, no image, oversized headline */
function C63_NewsBroadsheet({ item }: { item: CardItem }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-white p-3 shadow-[3px_3px_0_0_#1a1a1a]" style={{ fontFamily: "Georgia, serif" }}>
      <div className="mb-2 border-b-4 border-[#1a1a1a] pb-1 text-center">
        <p className="text-[0.58rem] font-black uppercase tracking-[0.25em]">★ Today&apos;s Special ★</p>
      </div>
      <h2 className="mb-2 text-2xl font-black uppercase leading-none tracking-tight text-[#1a1a1a]">{item.name}</h2>
      <div className="mb-1.5 flex gap-1 text-[0.52rem] uppercase tracking-widest text-neutral-400">
        <span>{item.category}</span><span>·</span><span>Today&apos;s Edition</span>
      </div>
      <p className="line-clamp-3 text-[0.68rem] leading-[1.4] text-[#3a3020]">{item.description || item.shortDesc}</p>
      <div className="mt-3 flex items-center justify-between border-t-2 border-[#1a1a1a] pt-2">
        <span className="text-xl font-black"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="bg-[#1a1a1a] px-3 py-1 text-[0.58rem] font-black uppercase tracking-widest text-white">Order</button>
      </div>
    </div>
  );
}

/** Newspaper — tabloid, full-bleed image, screaming headline */
function C64_NewsTabloid({ item }: { item: CardItem }) {
  return (
    <div className="overflow-hidden border border-[#c8b89a] bg-[#f4eed8]" style={{ fontFamily: "Georgia, serif" }}>
      <div className="flex items-center justify-between bg-[#1a1a1a] px-3 py-1">
        <span className="text-[0.5rem] font-black uppercase tracking-[0.2em] text-white">TABLOID ★ EXTRA</span>
        <span className="text-[0.5rem] uppercase tracking-wide text-neutral-400">{item.category}</span>
      </div>
      <div className="h-32 w-full">
        <ImgBlock item={item} className="h-full w-full" />
      </div>
      <div className="p-2.5">
        <h2 className="text-lg font-black uppercase leading-tight text-[#1a1a1a]">{item.name}</h2>
        <p className="mt-1 line-clamp-2 text-[0.62rem] leading-[1.35] text-[#3a3020]">{item.shortDesc}</p>
        <div className="mt-2 flex items-center justify-between border-t border-[#c8b89a] pt-1.5">
          <span className="text-base font-black text-[#1a1a1a]"><PriceDisplay prices={item.prices} /></span>
          <button type="button" className="border border-[#1a1a1a] px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wider">ORDER!</button>
        </div>
      </div>
    </div>
  );
}

/** Newspaper — vintage gazette, sepia, ornate border, greyscale image */
function C65_NewsVintage({ item }: { item: CardItem }) {
  return (
    <div className="border-2 border-[#8B7355] bg-[#FDF6E3] p-3 shadow-md" style={{ fontFamily: "Georgia, serif" }}>
      <div className="mb-2 text-center">
        <div className="h-px w-full bg-[#8B7355]" />
        <p className="py-1 text-[0.55rem] font-bold uppercase tracking-[0.3em] text-[#5a4a35]">❧ The Menu Gazette ❧</p>
        <div className="h-px w-full bg-[#8B7355]" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <span className="text-[0.52rem] uppercase tracking-widest text-[#8B7355]">{item.category}</span>
          <h2 className="mt-0.5 text-base font-black leading-tight text-[#2c2010]">{item.name}</h2>
          <p className="mt-1 line-clamp-3 text-[0.62rem] italic leading-[1.35] text-[#5a4a35]">{item.shortDesc}</p>
        </div>
        <div className="h-20 w-16 shrink-0 overflow-hidden border border-[#8B7355] grayscale">
          <ImgBlock item={item} className="h-full w-full" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-[#8B7355] pt-2">
        <span className="text-sm font-black text-[#2c2010]"><PriceDisplay prices={item.prices} /></span>
        <button type="button" className="border border-[#8B7355] px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-widest text-[#5a4a35]">✦ Order</button>
      </div>
    </div>
  );
}

// ─── Background Ideas ─────────────────────────────────────────────────────────

const BG_IDEAS: { name: string; value: string; dark?: boolean }[] = [
  // Solids — neutral
  { name: "Pure white",       value: "#ffffff" },
  { name: "Off-white",        value: "#fafaf9" },
  { name: "Warm cream",       value: "#fffbf0" },
  { name: "Cool slate",       value: "#f8fafc" },
  { name: "Warm sand",        value: "#faf5eb" },
  { name: "Newspaper",        value: "#f5f0e8" },
  // Solids — pastel
  { name: "Soft lavender",    value: "#f5f3ff" },
  { name: "Soft mint",        value: "#f0fdf4" },
  { name: "Soft blush",       value: "#fff1f2" },
  { name: "Soft sky",         value: "#f0f9ff" },
  { name: "Soft peach",       value: "#fff7ed" },
  { name: "Soft lemon",       value: "#fefce8" },
  { name: "Soft lilac",       value: "#faf5ff" },
  { name: "Soft rose",        value: "#fff5f5" },
  // Warm gradients
  { name: "Golden hour",      value: "linear-gradient(160deg, #fef9c3 0%, #fed7aa 100%)" },
  { name: "Peach rose",       value: "linear-gradient(135deg, #fff7ed 0%, #fce7f3 100%)" },
  { name: "Sunset",           value: "linear-gradient(135deg, #fef3c7 0%, #fca5a5 100%)" },
  { name: "Warm dusk",        value: "linear-gradient(160deg, #fdf4ff 0%, #fff0f3 50%, #fef3c7 100%)" },
  { name: "Spice market",     value: "linear-gradient(160deg, #fff7ed 0%, #fef3c7 50%, #fff1f2 100%)" },
  { name: "Honey",            value: "linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)" },
  // Cool gradients
  { name: "Arctic",           value: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)" },
  { name: "Ocean mist",       value: "linear-gradient(160deg, #e0f2fe 0%, #f0fdf4 100%)" },
  { name: "Purple haze",      value: "linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)" },
  { name: "Morning sky",      value: "linear-gradient(180deg, #e0f2fe 0%, #ffffff 100%)" },
  { name: "Candy",            value: "linear-gradient(135deg, #fce7f3 0%, #ede9fe 100%)" },
  { name: "Tropical",         value: "linear-gradient(135deg, #d1fae5 0%, #dbeafe 100%)" },
  { name: "Spring",           value: "linear-gradient(140deg, #d1fae5 0%, #fef9c3 100%)" },
  // Mesh / radial blobs
  { name: "Warm mesh",        value: "radial-gradient(ellipse at 20% 30%, #fef3c7 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #fce7f3 0%, transparent 60%), #fff7ed" },
  { name: "Cool mesh",        value: "radial-gradient(ellipse at 20% 30%, #dbeafe 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #d1fae5 0%, transparent 60%), #f8fafc" },
  { name: "Lilac mesh",       value: "radial-gradient(ellipse at 30% 20%, #f3e8ff 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, #fce7f3 0%, transparent 55%), #faf5ff" },
  { name: "Mint mesh",        value: "radial-gradient(ellipse at 0% 50%, #d1fae5 0%, transparent 55%), radial-gradient(ellipse at 100% 50%, #cffafe 0%, transparent 55%), #f0fdf4" },
  { name: "Sunset mesh",      value: "radial-gradient(ellipse at 10% 10%, #fef3c7 0%, transparent 60%), radial-gradient(ellipse at 90% 90%, #fecaca 0%, transparent 60%), #fff5f5" },
  { name: "Dusk mesh",        value: "radial-gradient(ellipse at 50% 0%, #e9d5ff 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #fbcfe8 0%, transparent 65%), #fdf4ff" },
  { name: "Food fest",        value: "radial-gradient(ellipse at 15% 85%, #fde68a 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, #fca5a5 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #d1fae5 0%, transparent 40%), #fffbf0" },
  // Dark / bold
  { name: "Midnight",         value: "#0f172a",   dark: true },
  { name: "Deep purple",      value: "#1e1b4b",   dark: true },
  { name: "Dark warm",        value: "#1c1917",   dark: true },
  { name: "Charcoal",         value: "#1f2937",   dark: true },
  { name: "Forest night",     value: "linear-gradient(160deg, #052e16 0%, #14532d 100%)", dark: true },
  { name: "Dark candy",       value: "linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)", dark: true },
];

export default async function AllCardsPage() {
  // Fetch real items from DB — prefer items with images
  let item1: CardItem;
  let item2: CardItem;

  try {
    const { items } = await listPublicMenuFromDb({});
    const withImg    = items.filter((i) => i.imageUrls.length > 0);
    const withoutImg = items.filter((i) => i.imageUrls.length === 0);
    const pool = [...withImg, ...withoutImg];

    const toCardItem = (i: (typeof pool)[0], fallbackTag: string): CardItem => ({
      name:        i.name,
      description: i.description ?? "",
      shortDesc:   shortDesc(i.description ?? ""),
      prices:      buildPrices(i),
      tag:         fallbackTag,
      emoji:       pickEmoji(i.categoryName),
      category:    i.categoryName,
      imageUrl:    i.imageUrls[0] ?? null,
      focalX:      i.focalX ?? 50,
      focalY:      i.focalY ?? 50,
    });

    item1 = toCardItem(pool[0] ?? items[0], "Popular");
    item2 = toCardItem(pool[1] ?? pool[0] ?? items[0], "Chef's Pick");
  } catch {
    // Fallback if DB is unavailable
    const fallback: CardItem = {
      name: "Kebab XL", description: "Grilled lamb & beef, garlic aioli, fries",
      shortDesc: "Grilled lamb & beef, garlic aioli, fries",
      prices: [{ label: "", amount: "€12,90" }],
      tag: "Popular", emoji: "🥙", category: "Kebab",
      imageUrl: null, focalX: 50, focalY: 50,
    };
    item1 = fallback;
    item2 = {
      ...fallback,
      name: "Pizza Fantasia",
      description: "Mozzarella, tomato, mushrooms, ham",
      shortDesc: "Mozzarella, tomato, mushrooms, ham",
      prices: [
        { label: "Large",  amount: "€14,50" },
        { label: "Family", amount: "€18,90" },
      ],
      category: "Pizza", emoji: "🍕", tag: "Chef's Pick",
    };
  }

  // Alternate items across cards so both show up
  const CARDS: { n: number; label: string; el: React.ReactNode }[] = [
    { n: 1,  label: "Current (reference)",        el: <C01_Current      item={item1} /> },
    { n: 2,  label: "Stacked — image on top",     el: <C02_Stacked      item={item2} /> },
    { n: 3,  label: "Overlay — text on image",    el: <C03_Overlay      item={item1} /> },
    { n: 4,  label: "Minimal list row",           el: <C04_MinimalList  item={item2} /> },
    { n: 5,  label: "Dark warm",                  el: <C05_DarkWarm     item={item1} /> },
    { n: 6,  label: "Neon night",                 el: <C06_NeonNight    item={item2} /> },
    { n: 7,  label: "Retro diner",                el: <C07_RetroDiner   item={item1} /> },
    { n: 8,  label: "Luxury dark",                el: <C08_Luxury       item={item2} /> },
    { n: 9,  label: "Pastel pop",                 el: <C09_PastelPop    item={item1} /> },
    { n: 10, label: "Brutalist",                  el: <C10_Brutalist    item={item2} /> },
    { n: 11, label: "Glassmorphism",              el: <C11_Glass        item={item1} /> },
    { n: 12, label: "Polaroid",                   el: <C12_Polaroid     item={item2} /> },
    { n: 13, label: "Magazine / editorial",       el: <C13_Magazine     item={item1} /> },
    { n: 14, label: "Menu board (LED)",           el: <C14_MenuBoard    item={item2} /> },
    { n: 15, label: "Social / Instagram",         el: <C15_Social       item={item1} /> },
    { n: 16, label: "Comic / fun",                el: <C16_Comic        item={item2} /> },
    { n: 17, label: "Neumorphic",                 el: <C17_Neumorphic   item={item1} /> },
    { n: 18, label: "Recipe card",                el: <C18_RecipeCard   item={item2} /> },
    { n: 19, label: "Hanging price tag",          el: <C19_PriceTag     item={item1} /> },
    { n: 20, label: "Wide landscape banner",      el: <C20_WideBanner   item={item2} /> },
    { n: 21, label: "Circular image",             el: <C21_CircleImage  item={item1} /> },
    { n: 22, label: "High contrast / accessible", el: <C22_HighContrast item={item2} /> },
    { n: 23, label: "Minimal mono",               el: <C23_MinimalMono  item={item1} /> },
    { n: 24, label: "Festival / gradient",        el: <C24_Festival     item={item2} /> },
    { n: 25, label: "Night market",               el: <C25_NightMarket  item={item1} /> },
    { n: 26, label: "Split tinted halves",        el: <C26_SplitTinted  item={item2} /> },
    { n: 27, label: "Outlined / hover reveal",    el: <C27_Outlined     item={item1} /> },
    { n: 28, label: "Compact quick-add",          el: <C28_Compact      item={item2} /> },
    { n: 29, label: "Stripe accent",              el: <C29_Stripe       item={item1} /> },
    { n: 30, label: "Pill / bubble shape",        el: <C30_Pill         item={item2} /> },
    { n: 31, label: "Polaroid — warm orange",     el: <C31_PolaroidWarm  item={item1} /> },
    { n: 32, label: "Polaroid — dark moody",      el: <C32_PolaroidDark  item={item2} /> },
    { n: 33, label: "Polaroid — stacked mint",    el: <C33_PolaroidMint  item={item1} /> },
    { n: 34, label: "Polaroid — stacked sky",     el: <C34_PolaroidSky   item={item2} /> },
    { n: 35, label: "Polaroid — hot pink retro",  el: <C35_PolaroidRetro item={item1} /> },
    { n: 36, label: "Polaroid — taped to board",  el: <C36_PolaroidTaped item={item2} /> },
    { n: 37, label: "Thermal receipt ticket",     el: <C37_Receipt       item={item1} /> },
    { n: 38, label: "iOS App Store card",         el: <C38_AppStore      item={item2} /> },
    { n: 39, label: "Boarding pass / ticket",     el: <C39_BoardingPass  item={item1} /> },
    { n: 40, label: "Chalkboard menu",            el: <C40_Chalkboard    item={item2} /> },
    { n: 41, label: "Sticky note / Post-it",      el: <C41_StickyNote    item={item1} /> },
    { n: 42, label: "Trading card (holographic)", el: <C42_TradingCard   item={item2} /> },
    { n: 43, label: "Story slide (9:16)",         el: <C43_StorySlide      item={item1} /> },
    { n: 44, label: "Taped + stack — warm body",         el: <C44_TapedStackWarm    item={item2} /> },
    { n: 45, label: "Taped + stack — dark body",         el: <C45_TapedStackDark    item={item1} /> },
    { n: 46, label: "Polaroid — dual corner tapes",      el: <C46_TapedDualCorner   item={item2} /> },
    { n: 47, label: "Polaroid — washi tape top",         el: <C47_TapedWashi        item={item1} /> },
    { n: 48, label: "Polaroid — side straps",            el: <C48_TapedSideStraps   item={item2} /> },
    { n: 49, label: "Polaroid — diagonal tape corner",   el: <C49_TapedDiagonal     item={item1} /> },
    { n: 50, label: "Diner — laminated red special",      el: <C50_Diner             item={item2} /> },
    { n: 51, label: "Newspaper clipping",                 el: <C51_Newspaper         item={item1} /> },
    { n: 52, label: "Price tag — hang tag + barcode",     el: <C52_PriceTag          item={item2} /> },
    { n: 53, label: "Film negative — sprocket strip",     el: <C53_FilmStrip         item={item1} /> },
    { n: 54, label: "Neon sign — dark glow",              el: <C54_NeonSign          item={item2} /> },
    { n: 55, label: "Matchbox label — vintage art",       el: <C55_Matchbox          item={item1} /> },
    { n: 56, label: "Night Market — category banner",     el: <C56_NightMarketDark   item={item2} /> },
    { n: 57, label: "Night Market — neon cyan glow",      el: <C57_NightMarketNeon   item={item1} /> },
    { n: 58, label: "Night Market — lantern strings",     el: <C58_NightMarketLantern item={item2} /> },
    { n: 59, label: "Night Market — chalkboard",          el: <C59_NightMarketChalk  item={item1} /> },
    { n: 60, label: "Sticky note — pink tilt",            el: <C60_StickyPink        item={item2} /> },
    { n: 61, label: "Sticky note — blue stack",           el: <C61_StickyStack       item={item1} /> },
    { n: 62, label: "Sticky note — green ruled",          el: <C62_StickyRuled       item={item2} /> },
    { n: 63, label: "Newspaper — bold broadsheet",        el: <C63_NewsBroadsheet    item={item1} /> },
    { n: 64, label: "Newspaper — tabloid screamer",       el: <C64_NewsTabloid       item={item2} /> },
    { n: 65, label: "Newspaper — vintage gazette",        el: <C65_NewsVintage       item={item1} /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-300 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight text-neutral-900">Card Style Showcase</h1>
          <p className="mt-1 text-sm text-neutral-500">
            55 designs with real menu data &amp; images ·{" "}
            <Link href="/menu" className="underline">back to menu</Link>
            {" · "}
            <a href="/api/allcards/sample-items" target="_blank" className="underline">
              browse API →
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(({ n, label, el }) => (
            <div key={n}>
              <Label n={n} name={label} />
              {el}
            </div>
          ))}
        </div>

        {/* ── Background Ideas ──────────────────────────────────────────── */}
        <div className="mt-20">
          <h2 className="text-2xl font-black tracking-tight text-neutral-900">Background Ideas</h2>
          <p className="mt-1 text-sm text-neutral-500">{BG_IDEAS.length} options — pick one and apply to globals.css</p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {BG_IDEAS.map((bg, i) => (
              <div key={i} className="flex flex-col gap-2">
                {/* Background preview with mini card */}
                <div
                  className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border border-neutral-200 shadow-sm"
                  style={{ background: bg.value }}
                >
                  {/* Mini stacked polaroid card */}
                  <div className="relative" style={{ width: 80 }}>
                    <div className="absolute inset-0 rounded-sm bg-emerald-300" style={{ transform: "translateX(6px) translateY(5px) rotate(3deg)" }} />
                    <div className="absolute inset-0 rounded-sm bg-emerald-100" style={{ transform: "translateX(3px) translateY(2.5px) rotate(1.5deg)" }} />
                    <div className="relative bg-white p-1.5" style={{ boxShadow: "3px 3px 0 0 #047857" }}>
                      <div className="h-11 w-full bg-neutral-200" />
                      <div className="mt-1.5 h-1.5 w-full rounded bg-neutral-300" />
                      <div className="mt-1 h-1 w-2/3 rounded bg-neutral-200" />
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <div className="h-2 w-6 rounded bg-neutral-300" />
                        <div className="h-3.5 w-8 rounded-sm bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className={`text-center text-xs font-semibold leading-tight ${bg.dark ? "text-neutral-400" : "text-neutral-700"}`}>
                  {bg.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-16 text-center text-xs text-neutral-400">
          /allcards · temporary · delete when done choosing
        </p>
      </div>
    </div>
  );
}
