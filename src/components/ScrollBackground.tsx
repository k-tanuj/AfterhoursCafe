import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SVGS } from "@/lib/svgs";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Sketchbook-themed scroll background. Fixed-position layered canvas:
 *  - notebook ruled lines that slide upward as you scroll
 *  - hand-drawn SVG paths that "draw themselves" tied to scroll progress
 *  - coffee-ring stains that fade in at journal-page intervals
 *  - margin doodles (stars, scribbles, arrows) that drift in from the edges
 *  - red margin line + page-fold vignette deepening into the night
 */
export function ScrollBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      // 1. Notebook ruled lines scroll upward subtly as you scroll
      gsap.to("[data-ruled]", {
        backgroundPositionY: "-=400",
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      // 2. Hand-drawn SVG strokes draw themselves on scroll progress
      const paths = root.querySelectorAll<SVGPathElement>("[data-draw]");
      paths.forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });
      gsap.to("[data-draw]", {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });

      // 3. Doodles drift in from off-screen on scroll, then ease out
      const doodles = root.querySelectorAll<HTMLElement>("[data-doodle]");
      doodles.forEach((el) => {
        const fromX = Number(el.dataset.fromX ?? 0);
        const fromY = Number(el.dataset.fromY ?? 0);
        const rot = Number(el.dataset.rot ?? 0);
        gsap.fromTo(
          el,
          { x: fromX, y: fromY, opacity: 0, rotate: rot - 20, scale: 0.8 },
          {
            x: 0,
            y: 0,
            opacity: Number(el.dataset.opacity ?? 0.35),
            rotate: rot,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: document.body,
              start: `top+=${el.dataset.start ?? "200"} top`,
              end: `top+=${el.dataset.end ?? "1400"} top`,
              scrub: 1,
            },
          },
        );
      });

      // 4. Coffee stains fade in at staggered scroll depths
      const stains = root.querySelectorAll<HTMLElement>("[data-stain]");
      stains.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.5 },
          {
            opacity: 0.22,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: document.body,
              start: `top+=${600 + i * 800} top`,
              end: `top+=${1200 + i * 800} top`,
              scrub: 1,
            },
          },
        );
      });

      // 5. Page-fold vignette deepens toward night
      gsap.to("[data-vignette]", {
        opacity: 0.45,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5,
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base warm paper */}
      <div className="absolute inset-0 bg-paper" />

      {/* Notebook ruled lines */}
      <div
        data-ruled
        className="absolute inset-0 opacity-[0.18] will-change-[background-position]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, hsl(210 40% 30% / 0.5) 31px, hsl(210 40% 30% / 0.5) 32px)",
          backgroundSize: "100% 32px",
        }}
      />

      {/* Red margin line (left) */}
      <div
        className="absolute top-0 bottom-0 left-[72px] w-px opacity-30"
        style={{ background: "hsl(0 70% 50%)" }}
      />

      {/* Hand-drawn SVG paths that draw on scroll */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
        stroke="hsl(210 25% 12%)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      >
        {/* underline scribble top right */}
        <path
          data-draw
          d="M 1100 120 C 1180 100, 1280 140, 1380 110 S 1500 130, 1420 150"
        />
        {/* spiral mid-left */}
        <path
          data-draw
          d="M 120 380 q 30 -30 60 0 q -60 60 -30 100 q 100 -30 80 -110 q -60 -50 -140 20"
        />
        {/* arrow lower center */}
        <path
          data-draw
          d="M 600 720 C 700 700, 820 760, 900 720 M 880 700 L 900 720 L 880 740"
        />
        {/* squiggle right side */}
        <path
          data-draw
          d="M 1300 500 q 20 -20 40 0 t 40 0 t 40 0 t 40 0"
        />
        {/* corner star burst */}
        <path
          data-draw
          d="M 80 80 L 110 110 M 110 80 L 80 110 M 95 65 L 95 125 M 65 95 L 125 95"
        />
      </svg>

      {/* Coffee ring stains */}
      {[
        { top: "20%", left: "12%", size: 220 },
        { top: "55%", right: "8%", size: 180 },
        { top: "85%", left: "30%", size: 260 },
      ].map((s, i) => (
        <div
          key={i}
          data-stain
          className="absolute rounded-full opacity-0"
          style={{
            top: (s as any).top,
            left: (s as any).left,
            right: (s as any).right,
            width: s.size,
            height: s.size,
            background:
              "radial-gradient(circle, transparent 38%, hsl(25 70% 30% / 0.4) 42%, hsl(25 70% 30% / 0.15) 50%, transparent 60%)",
            filter: "blur(0.5px)",
          }}
        />
      ))}

      {/* Journal doodles drifting in from edges on scroll */}
      {[
        { name: "moon", top: "12%", left: "78%", size: 90, fromX: 200, fromY: -50, rot: -12, opacity: 0.4, start: 100, end: 900 },
        { name: "sparkle", top: "30%", left: "5%", size: 70, fromX: -150, fromY: 30, rot: 18, opacity: 0.55, start: 300, end: 1100 },
        { name: "beans", top: "48%", left: "85%", size: 120, fromX: 250, fromY: 80, rot: 10, opacity: 0.3, start: 500, end: 1500 },
        { name: "wavy-line", top: "62%", left: "8%", size: 200, fromX: -250, fromY: 0, rot: -8, opacity: 0.25, start: 700, end: 1800 },
        { name: "flowers", top: "78%", left: "70%", size: 160, fromX: 220, fromY: 80, rot: 6, opacity: 0.28, start: 900, end: 2100 },
        { name: "heart", top: "88%", left: "20%", size: 70, fromX: -100, fromY: 100, rot: 0, opacity: 0.35, start: 1100, end: 2300 },
        { name: "sparkle", top: "92%", left: "55%", size: 50, fromX: 80, fromY: 120, rot: 20, opacity: 0.5, start: 1300, end: 2500 },
      ].map((d, i) => {
        if (!SVGS[d.name]) return null;
        return (
          <img
            key={i}
            src={SVGS[d.name]}
            alt=""
            data-doodle
            data-from-x={d.fromX}
            data-from-y={d.fromY}
            data-rot={d.rot}
            data-opacity={d.opacity}
            data-start={d.start}
            data-end={d.end}
            className="absolute object-contain will-change-transform"
            style={{
              top: d.top,
              left: d.left,
              width: d.size,
              height: d.size,
              opacity: 0,
            }}
          />
        );
      })}

      {/* Page-fold / dusk vignette */}
      <div
        data-vignette
        className="absolute inset-0 opacity-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, hsl(220 40% 8% / 0.6) 100%)",
        }}
      />
    </div>
  );
}