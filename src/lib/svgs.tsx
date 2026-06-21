// Auto-glob all local SVG files and expose a typed name → url map.
import type { ImgHTMLAttributes } from "react";

const modules = import.meta.glob("../assets/svgs/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function nameFromPath(p: string) {
  // ../assets/svgs/empty-coffee-cup.svg -> empty-coffee-cup
  return p.split("/").pop()!.replace(".svg", "");
}

export const SVGS: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([p, url]) => [nameFromPath(p), url]),
);

export type SvgName = keyof typeof SVGS;

export function Svg({
  name,
  alt,
  ...rest
}: { name: string; alt?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const url = SVGS[name];
  if (!url) return null;
  return <img src={url} alt={alt ?? name} draggable={false} {...rest} />;
}