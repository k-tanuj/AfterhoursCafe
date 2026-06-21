import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Svg } from "@/lib/svgs";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Floating hand-drawn marginalia. Uses absolute positioning + GSAP
// looping motion. Pointer-events disabled so it never blocks UI.
const ITEMS = [
  { name: "moon", top: "8%", left: "4%", size: 110, opacity: 0.18, dur: 9, depth: 0.3 },
  { name: "sparkle", top: "18%", right: "8%", size: 60, opacity: 0.28, dur: 6, depth: 0.6 },
  { name: "cloud", top: "32%", left: "-3%", size: 220, opacity: 0.10, dur: 14, depth: 0.15 },
  { name: "beans", top: "55%", right: "3%", size: 150, opacity: 0.12, dur: 12, depth: 0.45 },
  { name: "flowers", bottom: "8%", left: "2%", size: 180, opacity: 0.12, dur: 11, depth: 0.25 },
  { name: "sparkle", bottom: "22%", right: "12%", size: 40, opacity: 0.32, dur: 5, depth: 0.7 },
  { name: "wavy-line", top: "70%", left: "40%", size: 220, opacity: 0.08, dur: 10, depth: 0.5 },
  { name: "heart", top: "44%", left: "48%", size: 70, opacity: 0.10, dur: 8, depth: 0.4 },
  { name: "vinyl", top: "5%", left: "55%", size: 90, opacity: 0.10, dur: 20, depth: 0.2 },
  { name: "coffee", top: "82%", right: "30%", size: 80, opacity: 0.14, dur: 9, depth: 0.55 },
  { name: "open-book", top: "26%", left: "30%", size: 100, opacity: 0.10, dur: 13, depth: 0.35 },
  { name: "headphones", bottom: "35%", left: "20%", size: 90, opacity: 0.12, dur: 11, depth: 0.5 },
] as const;

export function BackgroundDoodles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll<HTMLElement>("[data-float]");
    const ctx = gsap.context(() => {
      els.forEach((el, i) => {
        const dur = Number(el.dataset.dur ?? 8);
        const depth = Number(el.dataset.depth ?? 0.3);
        // idle floating
        gsap.to(el, {
          y: "+=20",
          x: i % 2 === 0 ? "+=8" : "-=8",
          rotate: i % 2 === 0 ? "+=6" : "-=6",
          duration: dur,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        // scroll-driven parallax — moves opposite to scroll proportional to depth
        gsap.to(el, {
          yPercent: -60 * depth,
          ease: "none",
          scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {ITEMS.map((it, i) => (
        <div
          key={i}
          data-float
          data-dur={it.dur}
          data-depth={it.depth}
          className="absolute will-change-transform"
          style={{
            top: (it as any).top,
            left: (it as any).left,
            right: (it as any).right,
            bottom: (it as any).bottom,
            width: it.size,
            height: it.size,
            opacity: it.opacity,
          }}
        >
          <Svg name={it.name} className="w-full h-full object-contain" />
        </div>
      ))}
    </div>
  );
}