import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/SiteShell";
import { Scribble, Star } from "@/components/Doodles";
import { Svg } from "@/lib/svgs";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import espresso from "@/assets/drink-espresso.jpg";
import coldbrew from "@/assets/drink-coldbrew.jpg";
import matcha from "@/assets/drink-matcha.jpg";
import { getPublicMenu, type PublicMenuItem } from "@/lib/menu.functions";

import wafflesVideo from "@/assets/menu videos/Waffles.mp4";
import coldCoffeeVideo from "@/assets/menu videos/cold coffee.mp4";
import donutsVideo from "@/assets/menu videos/donuts.mp4";
import hotCoffeeVideo from "@/assets/menu videos/hot coffee.mp4";
import pancakesVideo from "@/assets/menu videos/pancakes.mp4";
import smoothiesVideo from "@/assets/menu videos/smoothies.mp4";
import toastVideo from "@/assets/menu videos/toast.mp4";

const getVideoForCategory = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("waffle")) return wafflesVideo;
  if (c.includes("cold coffee") || c.includes("cold brew") || c.includes("cold drink") || c === "coffee (cold)") return coldCoffeeVideo;
  if (c.includes("hot coffee") || c.includes("espresso") || c.includes("hot drink") || c === "coffee (hot)") return hotCoffeeVideo;
  if (c.includes("donut") || c.includes("pastry")) return donutsVideo;
  if (c.includes("pancake")) return pancakesVideo;
  if (c.includes("smoothie") || c.includes("shake") || c.includes("blend")) return smoothiesVideo;
  if (c.includes("toast") || c.includes("sandwich")) return toastVideo;
  
  if (c === "coffee" || c === "drinks") return hotCoffeeVideo;
  
  return null;
};

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — AFTERHOURS" },
      { name: "description", content: "Hot, cold, sweet, strong, study, late-night — pick your poison." },
      { property: "og:title", content: "Menu — AFTERHOURS" },
      { property: "og:description", content: "Hot, cold, sweet, strong, study, late-night — pick your poison." },
    ],
  }),
  component: MenuPage,
});

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

const menuImagesRaw = import.meta.glob('../assets/menu items/**/*.{jpg,png,jpeg,webp}', { eager: true });
const MENU_IMAGES: Record<string, string> = {};
for (const [path, module] of Object.entries(menuImagesRaw)) {
  const filename = path.split('/').pop()?.split('.')[0];
  if (filename) {
    MENU_IMAGES[normalizeName(filename)] = (module as any).default || module;
  }
}

// Fallback images for items that don't yet have an image_url
const FALLBACK_IMAGES: Record<string, string> = {
  "ghost shot espresso": espresso,
  "cloudy cold brew": coldbrew,
  "midnight matcha": matcha,
};

const ROTATIONS = ["-rotate-[2deg]", "rotate-[2deg]", "-rotate-[1deg]", "rotate-[3deg]", "-rotate-[3deg]", "rotate-[1deg]"];

function MenuPage() {
  const fetchMenu = useServerFn(getPublicMenu);
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["public-menu"],
    queryFn: () => fetchMenu(),
    staleTime: 60_000,
  });

  const cats = useMemo(() => {
    const set = new Set<string>();
    items.forEach((d) => set.add(d.category));
    return ["All", ...Array.from(set)];
  }, [items]);

  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const headRef = useScrollReveal<HTMLDivElement>({ stagger: 0.08, y: 30 });
  const gridRef = useScrollReveal<HTMLDivElement>({ stagger: 0.06, y: 30 });

  const filtered = useMemo(
    () =>
      items.filter(
        (d) =>
          (cat === "All" || d.category === cat) &&
          (q === "" ||
            d.name.toLowerCase().includes(q.toLowerCase()) ||
            d.description.toLowerCase().includes(q.toLowerCase())),
      ),
    [items, cat, q],
  );

  return (
    <SiteShell>
      <section ref={headRef} className="max-w-6xl mx-auto px-4 md:px-8 pt-16 pb-12">
        <p data-reveal className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 002 · the brew list</p>
        <div data-reveal className="mt-3 flex flex-wrap items-center justify-between gap-6">
          <h1 className="font-display text-6xl md:text-8xl">The Menu.</h1>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("buddy:open"))}
            className="group relative inline-flex items-center justify-center hover:scale-[1.03] active:scale-[0.98] transition-transform -rotate-[2deg]"
            aria-label="Ask Buddy what to order"
          >
            <svg viewBox="0 0 260 80" className="w-[240px] h-[70px]" fill="none">
              <path
                d="M 14 40 C 10 16, 70 8, 130 10 C 200 12, 250 18, 250 40 C 250 64, 200 72, 130 70 C 70 68, 18 62, 14 40 Z"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-ink"
              />
              <path d="M 18 44 C 16 20, 74 14, 128 14 C 196 16, 246 22, 246 42"
                stroke="currentColor" strokeWidth="1.5" opacity="0.55" className="text-ink" />
              <path d="M 22 46 C 60 56, 190 60, 244 44"
                stroke="currentColor" strokeWidth="1.5" opacity="0.45" className="text-ink" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center gap-2 font-display text-xl md:text-2xl text-ink">
              <Svg name="message-cloud" className="size-5" />
              ask buddy
              <Svg name="arrow-right" className="size-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
        <Scribble className="w-40 text-accent/60 mt-2" />
        <p data-reveal className="mt-4 italic text-ink/70 max-w-xl">
          can't decide? buddy reads the room — tell them your mood and they'll pick a cup for you.
        </p>

        <div data-reveal className="mt-10 flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search — try 'matcha' or 'late'"
            className="bg-transparent border-b-2 border-ink/20 focus:border-accent outline-none font-mono text-sm pb-2 md:w-80 transition-colors"
          />
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-1 border border-ink/20 rounded-full font-display text-lg transition-colors ${
                  cat === c ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"
                }`}
              >
                {c.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-6 font-mono text-xs text-accent">couldn't load the menu — try again in a moment.</p>
        ) : (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-widest opacity-50">
            {isLoading ? "loading menu…" : `${filtered.length} item${filtered.length === 1 ? "" : "s"} found`}
          </p>
        )}

        <div ref={gridRef} className="mt-12 flex flex-col gap-16">
          {cats.filter(c => c !== "All").map((categoryName) => {
            const categoryItems = filtered.filter(d => d.category === categoryName);
            if (categoryItems.length === 0) return null;

            return (
              <div key={categoryName} className="flex flex-col gap-8">
                <h2 data-reveal className="font-display text-4xl border-b-2 border-ink/10 pb-2">{categoryName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 grid-flow-dense">
                  {(() => {
                    const videoSrc = getVideoForCategory(categoryName);
                    
                    const renderedItems = categoryItems.map((d, i) => {
                      const rot = ROTATIONS[i % ROTATIONS.length];
                      const img = d.image_url || MENU_IMAGES[normalizeName(d.name)] || FALLBACK_IMAGES[d.name.toLowerCase()];
                      return (
                        <div
                          key={d.id}
                          data-reveal
                          className={`h-fit relative bg-white p-4 pb-14 shadow-xl ${rot} hover:rotate-0 hover:scale-105 transition-transform`}
                        >
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-tape border-x border-black/5 -rotate-2 z-10 shadow-sm" />
                          {img ? (
                            <img src={img} alt={d.name} loading="lazy" className="w-full aspect-square object-cover mb-3" />
                          ) : (
                            <div className="w-full aspect-square bg-stone-100 mb-3 grid place-items-center text-ink/30 font-mono text-[10px] uppercase">
                              <div className="text-center">
                                <Star className="size-10 mx-auto mb-2 opacity-50" />
                                No photo yet
                              </div>
                            </div>
                          )}
                          <p className="font-display text-2xl text-center">{d.name}</p>
                          <p className="text-center text-sm italic mt-1 text-ink/70">{d.description}</p>
                          <div className="absolute bottom-3 left-4 font-mono text-[10px] opacity-60">{d.category.toLowerCase()}</div>
                          <div className="absolute bottom-3 right-4 font-display text-xl text-accent">₹{d.price}</div>
                        </div>
                      );
                    });

                    if (videoSrc) {
                      let insertIndex = 0;
                      let videoClasses = "aspect-video sm:col-span-2";
                      const c = categoryName.toLowerCase();

                      if (c.includes("hot coffee") || c === "coffee (hot)") {
                        insertIndex = 0;
                        videoClasses = "aspect-video col-span-1 sm:col-span-2 lg:col-span-3";
                      } else if (c.includes("cold coffee") || c === "coffee (cold)") {
                        insertIndex = 0;
                        videoClasses = "aspect-video sm:col-span-2";
                      } else if (c.includes("waffle")) {
                        insertIndex = Math.min(2, renderedItems.length);
                        videoClasses = "aspect-[9/16] row-span-2";
                      } else if (c.includes("pancake")) {
                        insertIndex = renderedItems.length;
                        videoClasses = "aspect-video col-span-1 sm:col-span-2 lg:col-span-3";
                      } else if (c.includes("donut") || c.includes("pastry")) {
                        insertIndex = 0;
                        videoClasses = "aspect-[9/16] row-span-2";
                      } else if (c.includes("smoothie") || c.includes("shake")) {
                        insertIndex = Math.min(1, renderedItems.length);
                        videoClasses = "aspect-video sm:col-span-2";
                      } else {
                        insertIndex = (categoryName.charCodeAt(0) + categoryName.length) % (Math.max(1, renderedItems.length));
                        videoClasses = "aspect-video sm:col-span-2";
                      }

                      const videoElement = (
                        <div key={`video-${categoryName}`} data-reveal className={`${videoClasses} relative rounded-[2rem] overflow-hidden shadow-xl bg-[#111] group flex items-center justify-center`}>
                          <video 
                            src={videoSrc} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 pointer-events-none" />
                          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2rem] pointer-events-none" />
                          <div className="absolute bottom-8 left-8 text-white z-10 pointer-events-none">
                            <h3 className="font-display text-5xl md:text-6xl tracking-wide drop-shadow-md">{categoryName}</h3>
                            <div className="mt-4 flex items-center gap-3">
                              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full font-mono text-xs uppercase tracking-wider text-white shadow-sm border border-white/20">
                                Signature
                              </span>
                              <span className="font-mono text-sm opacity-90">Watch it made</span>
                            </div>
                          </div>
                        </div>
                      );
                      renderedItems.splice(insertIndex, 0, videoElement);
                    }

                    return renderedItems;
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && filtered.length === 0 && (
          <p className="mt-20 text-center font-display text-3xl text-ink/40">
            nothing here. try a different mood.
          </p>
        )}

      </section>
    </SiteShell>
  );
}