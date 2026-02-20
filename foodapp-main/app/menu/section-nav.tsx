"use client";

import { useEffect, useMemo, useState } from "react";

type SectionLink = {
  id: string;
  name: string;
  anchor: string;
};

type SectionNavProps = {
  sections: SectionLink[];
  orientation?: "horizontal" | "vertical";
};

export function SectionNav({ sections, orientation = "horizontal" }: SectionNavProps) {
  const [activeAnchor, setActiveAnchor] = useState(sections[0]?.anchor ?? "");
  const sectionAnchors = useMemo(() => new Set(sections.map((section) => section.anchor)), [sections]);

  useEffect(() => {
    if (sections.length === 0) {
      return;
    }

    const updateFromScroll = () => {
      const activationOffset = 220;
      let nextActive = sections[0]?.anchor ?? "";

      for (const section of sections) {
        const element = document.getElementById(section.anchor);
        if (!element) {
          continue;
        }
        if (window.scrollY + activationOffset >= element.offsetTop) {
          nextActive = section.anchor;
        }
      }

      setActiveAnchor(nextActive);
    };

    const syncWithHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (sectionAnchors.has(hash)) {
        setActiveAnchor(hash);
        return;
      }
      updateFromScroll();
    };

    syncWithHash();
    window.addEventListener("hashchange", syncWithHash);

    let ticking = false;
    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(() => {
        updateFromScroll();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateFromScroll();

    return () => {
      window.removeEventListener("hashchange", syncWithHash);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sectionAnchors, sections]);

  const isVertical = orientation === "vertical";

  return (
    <nav className={isVertical ? "sticky top-24 z-20" : "sticky top-20 z-30"}>
      <div
        className={`rounded-2xl border border-[var(--line)] bg-white/95 p-2 shadow-sm backdrop-blur ${
          isVertical ? "max-w-[170px]" : ""
        }`}
      >
        <div className={isVertical ? "grid gap-2" : "flex flex-wrap gap-2.5"}>
          {sections.map((section) => {
            const isActive = section.anchor === activeAnchor;
            return (
              <a
                key={section.id}
                href={`#${section.anchor}`}
                onClick={() => setActiveAnchor(section.anchor)}
                className={
                  isVertical
                    ? `rounded-full border px-4 py-1.5 text-sm font-semibold text-center ${
                        isActive
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      }`
                    : `rounded-full border px-4 py-1.5 text-sm font-semibold ${
                        isActive
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      }`
                }
              >
                {section.name}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
