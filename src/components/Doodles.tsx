import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CoffeeCup(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      <path d="M10 24h36v18a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10z" />
      <path d="M46 28h6a6 6 0 0 1 0 12h-6" />
      <path d="M20 10c-2 4 2 6 0 10" />
      <path d="M28 8c-2 4 2 6 0 10" />
      <path d="M36 10c-2 4 2 6 0 10" />
    </svg>
  );
}

export function Moon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      <path d="M44 8a24 24 0 1 0 12 36A20 20 0 0 1 44 8z" />
      <circle cx="20" cy="20" r="1.2" fill="currentColor" />
      <circle cx="14" cy="34" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function Star(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      <path d="M32 6l6 18 18 2-14 12 5 18-15-10-15 10 5-18-14-12 18-2z" />
    </svg>
  );
}

export function Heart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      <path d="M32 54s-22-12-22-28a12 12 0 0 1 22-6 12 12 0 0 1 22 6c0 16-22 28-22 28z" />
    </svg>
  );
}

export function Scribble(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 24" {...base} {...props}>
      <path d="M2 14c8-12 16 8 24 0s16 8 24 0 16 8 24 0 16 8 24 0 16 8 20-4" />
    </svg>
  );
}

export function Arrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 40" {...base} {...props}>
      <path d="M4 28c10-18 30-22 50-14" />
      <path d="M54 14l4 4-6 2" />
    </svg>
  );
}

export function Stamp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      <circle cx="32" cy="32" r="22" />
      <path d="M22 26h20v6a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6z" />
      <path d="M42 28h4a3 3 0 0 1 0 6h-4" />
      <path d="M26 16c-1 3 2 4 0 8" />
      <path d="M32 14c-1 3 2 4 0 8" />
      <path d="M38 16c-1 3 2 4 0 8" />
    </svg>
  );
}

export function Paperclip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      <path d="M44 10v32a12 12 0 0 1-24 0V18a8 8 0 0 1 16 0v22a4 4 0 0 1-8 0V22" />
    </svg>
  );
}