import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Reveal direct children (or [data-reveal] elements) as they scroll into view.
 * Apply via ref on a section wrapper.
 */
export function useScrollReveal<T extends HTMLElement>(opts?: {
  selector?: string;
  stagger?: number;
  y?: number;
}) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const sel = opts?.selector ?? "[data-reveal]";
    const targets = root.querySelectorAll<HTMLElement>(sel);
    if (!targets.length) return;
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        y: opts?.y ?? 40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: opts?.stagger ?? 0.1,
        scrollTrigger: {
          trigger: root,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
    }, root);
    return () => ctx.revert();
  }, [opts?.selector, opts?.stagger, opts?.y]);
  return ref;
}