import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, TornDivider } from "@/components/SiteShell";
import { Heart, Moon, Star, Scribble, CoffeeCup } from "@/components/Doodles";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import exterior from "@/assets/about page/exterior.jpeg";
import indoor from "@/assets/about page/indoor.jpeg";
import windowImg from "@/assets/about page/window.jpeg";
import outdoor from "@/assets/about page/outdoor.jpeg";
import headerVideo from "@/assets/about page/about header.mp4";

const CORNERS = [
  { src: indoor, name: "Indoor" },
  { src: windowImg, name: "Window" },
  { src: exterior, name: "Exterior" },
  { src: outdoor, name: "Outdoor" },
];

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — AFTERHOURS" },
      { name: "description", content: "A late-night café built around doodles, polaroids, and the third cup." },
      { property: "og:title", content: "About — AFTERHOURS" },
      { property: "og:description", content: "A late-night café built around doodles, polaroids, and the third cup." },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  { icon: <Heart className="size-8" />, t: "you can just sit", d: "no timers. no two-hour limits. if you need to stay till closing without ordering again, that's the whole point." },
  { icon: <Moon className="size-8" />, t: "made for the in-between", d: "between jobs, between people, between who you were last year and whoever you're becoming. we kept a seat." },
  { icon: <Star className="size-8" />, t: "quiet on purpose", d: "low light, low volume, low pressure. no one's filming. no one's networking. you can exhale here." },
];

function AboutPage() {
  const introRef = useScrollReveal<HTMLDivElement>({ stagger: 0.1, y: 40 });
  const visionRef = useScrollReveal<HTMLDivElement>({ stagger: 0.12, y: 40 });
  const galleryRef = useScrollReveal<HTMLDivElement>({ stagger: 0.1, y: 50 });
  return (
    <SiteShell>
      <div className="relative w-full aspect-video md:aspect-[21/9] bg-[#111] flex items-center justify-center overflow-hidden">
        <video 
          src={headerVideo} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
        <h1 className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 text-center text-white font-display text-5xl md:text-8xl tracking-wider drop-shadow-lg z-10 pointer-events-none">
          AFTERHOURS.
        </h1>
      </div>

      <section ref={introRef} className="max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-12">
        <p data-reveal className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 004 · why we exist</p>
        <h2 data-reveal className="font-display text-5xl md:text-7xl mt-3 leading-[0.95]">
          a café for the hours <span className="text-accent">no one</span> shows up for.
        </h2>
        <Scribble className="w-40 text-accent/60 mt-4" />

        <div className="mt-12 space-y-6 text-lg leading-relaxed text-ink/85 max-w-2xl">
          <p data-reveal>
            most places want you in and out. order, sit, finish, leave. we kept noticing the people who needed
            the opposite — a long table, a warm cup, and no one watching the clock. so we built that instead.
          </p>
          <p data-reveal>
            AFTERHOURS is for the burnout days, the deadline weeks, the soft sad sundays, the i-just-got-off-work
            tuesdays. for the friend who replied late. for the person eating alone with a book. for whoever you
            are at 11pm when the version of you the world sees finally clocks out.
          </p>
        </div>
      </section>

      <TornDivider />

      <section ref={visionRef} className="max-w-5xl mx-auto px-4 md:px-8">
        <h2 data-reveal className="font-display text-4xl md:text-5xl mb-2">what we actually mean by afterhours</h2>
        <p data-reveal className="italic text-ink/70 max-w-2xl">
          not just the time on a clock. it's the version of you that comes out when the day finally lets go —
          softer, slower, a little more honest. we made a place for that one.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <div key={v.t} data-reveal className="bg-white/60 border border-ink/10 p-6 shadow-sm hover:-rotate-1 transition-transform">
              <div className="text-accent">{v.icon}</div>
              <h3 className="font-display text-2xl mt-3">{v.t}</h3>
              <p className="text-sm italic mt-2 text-ink/70">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      <TornDivider />

      <section ref={galleryRef} className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between mb-10 gap-6">
          <h2 data-reveal className="font-display text-4xl md:text-5xl">corners of the place</h2>
          <CoffeeCup className="size-10 text-accent" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {CORNERS.map((corner, i) => (
            <div
              key={i}
              data-reveal
              className={`bg-white p-3 pb-8 shadow-lg ${i % 2 ? "rotate-[2deg]" : "-rotate-[2deg]"} hover:rotate-0 transition-transform`}
            >
              <img src={corner.src} alt="" loading="lazy" className="w-full aspect-square object-cover" />
              <p className="text-center font-display text-sm mt-2 text-ink/70">{corner.name}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}