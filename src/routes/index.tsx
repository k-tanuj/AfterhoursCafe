import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteShell, TornDivider } from "@/components/SiteShell";
import { Arrow, Heart, Moon, Scribble, Star } from "@/components/Doodles";
import { Svg } from "@/lib/svgs";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useAuth } from "@/hooks/use-auth";
import espresso from "@/assets/drink-espresso.jpg";
import coldbrew from "@/assets/drink-coldbrew.jpg";
import matcha from "@/assets/drink-matcha.jpg";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AFTERHOURS — Relief, after the hard part." },
      { name: "description", content: "A sketchbook café for your afterhours — the quiet hour after the deadline, the shift, the long day. Sit, breathe, brew." },
      { property: "og:title", content: "AFTERHOURS — Relief, after the hard part." },
      { property: "og:description", content: "A sketchbook café for your afterhours — the quiet hour after the deadline, the shift, the long day. Sit, breathe, brew." },
    ],
  }),
  component: IndexRoute,
});

const DRINKS = [
  { id: "001", name: "Ghost Shot Espresso", img: espresso, rot: "-rotate-[2deg]" },
  { id: "002", name: "Cloudy Cold Brew", img: coldbrew, rot: "rotate-[3deg]" },
  { id: "003", name: "Midnight Matcha", img: matcha, rot: "-rotate-[1deg]" },
];


function Polaroid({ drink }: { drink: (typeof DRINKS)[number] }) {
  return (
    <div
      data-reveal
      className={`relative bg-white p-4 pb-12 shadow-xl ${drink.rot} transition-transform duration-300 hover:rotate-0 hover:scale-[1.03] hover:z-20`}
    >
      <Svg
        name="tape"
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-auto -rotate-2 z-10 pointer-events-none"
      />
      <img
        src={drink.img}
        alt={drink.name}
        width={800}
        height={800}
        loading="lazy"
        className="w-full aspect-square object-cover outline-1 -outline-offset-1 outline-black/10 mb-4 grayscale-[10%]"
      />
      <p className="font-display text-2xl text-center text-ink">{drink.name}</p>
      <span className="absolute bottom-2 right-4 font-mono text-[10px] opacity-50">{drink.id}.</span>
    </div>
  );
}

function Index() {
  const heroRef = useRef<HTMLDivElement>(null);
  const drinksRef = useScrollReveal<HTMLDivElement>({ stagger: 0.15 });
  const loyaltyRef = useScrollReveal<HTMLDivElement>({ stagger: 0.12, y: 30 });
  const ctaRef = useScrollReveal<HTMLDivElement>({ stagger: 0.1 });

  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-hero-eyebrow]", { y: 20, opacity: 0, duration: 0.6 })
        .from("[data-hero-title] > *", { y: 60, opacity: 0, duration: 1, stagger: 0.08 }, "-=0.3")
        .from("[data-hero-sub]", { y: 30, opacity: 0, duration: 0.8 }, "-=0.5")
        .from("[data-hero-cta] > *", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.4")
        .from("[data-hero-float]", { scale: 0, rotate: -180, opacity: 0, duration: 0.8, stagger: 0.1, ease: "back.out(2)" }, "-=0.8");
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <SiteShell>
      <section ref={heroRef} className="max-w-6xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-12 relative">
        <Svg name="sparkle" data-hero-float className="absolute top-8 right-8 w-16 h-16" />
        <Svg name="moon" data-hero-float className="absolute top-32 left-2 md:left-12 w-20 h-20 hidden md:block" />
        <Svg name="coffee" data-hero-float className="absolute top-24 right-32 w-24 h-24 opacity-80 hidden lg:block" />
        <Svg name="sketch-line" data-hero-float className="absolute -bottom-4 left-10 w-40 hidden md:block" />

        <p data-hero-eyebrow className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/50 mb-6">
          for your afterhours · the hour after the hard part
        </p>
        <h1 data-hero-title className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.95] tracking-tight text-balance max-w-[14ch]">
          <span className="inline-block">Coffee.</span>{" "}
          <span className="inline-block text-accent relative">
            Conversations.
            <span className="absolute left-0 right-0 -bottom-6 h-6 overflow-hidden pointer-events-none">
              <Svg name="underline" className="absolute left-0 top-1/2 w-full -translate-y-1/2" />
            </span>
          </span>{" "}
          <span className="inline-block">Chaos.</span>
        </h1>
        <p data-hero-sub className="mt-8 max-w-xl text-lg md:text-xl italic font-light leading-relaxed text-ink/80">
          Afterhours isn't about the clock. It's the breath you take after the deadline, the shift, the long week. Pull up a chair — the kettle's humming, and there's nowhere you need to be.
        </p>

        <div data-hero-cta className="mt-10 flex flex-wrap items-center gap-6">
          <Link
            to="/booking"
            className="relative inline-block px-8 py-3 font-display text-2xl bg-ink text-paper rounded-[2px] hover:scale-105 active:scale-95 transition-transform"
          >
            Reserve your table
            <span className="absolute -right-6 -bottom-3 text-accent text-sm font-mono rotate-12">*don't sleep!</span>
          </Link>
          <Link to="/menu" className="font-mono text-xs uppercase tracking-widest underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
            or see the menu →
          </Link>
        </div>
      </section>

      <TornDivider />

      <section ref={drinksRef} className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between mb-12 gap-6">
          <h2 data-reveal className="font-display text-4xl md:text-5xl">Featured Concoctions</h2>
          <Svg name="curve-arrow" data-reveal className="hidden md:block w-28 -rotate-12" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
          {DRINKS.map((d) => (
            <Polaroid key={d.id} drink={d} />
          ))}
        </div>
      </section>

      <TornDivider />

      <section ref={loyaltyRef} className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-[auto_auto] gap-5 md:gap-6">
          <div data-reveal className="md:col-span-4 md:row-span-2 bg-ink text-paper p-8 rounded-sm shadow-2xl relative">
            <Svg name="sparkle" className="absolute -top-6 -right-6 w-14 h-14 animate-paper-float" />
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-widest">Buddy</span>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded text-sm italic border-l-2 border-accent">
                "It's raining outside and you've had three shots already. Try the Lavender Fog — it'll ground you."
              </div>
              <div className="flex justify-end">
                <div className="bg-accent/80 p-3 rounded text-sm max-w-[80%]">deep & dark please. need to finish a chapter.</div>
              </div>
              <div className="bg-white/10 p-4 rounded text-sm italic border-l-2 border-accent">
                "Ghost Shot Espresso. Double, no sugar. Don't blame me when you finish the whole book tonight."
              </div>
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest opacity-60">
              Talks in english · हिंदी · always sleepy
            </p>
          </div>

          <div data-reveal className="md:col-span-2 bg-amber-50 border border-ink/15 p-6 rounded-sm shadow-sm rotate-[2deg] hover:rotate-0 transition-transform relative">
            <Svg name="message-cloud" className="absolute -top-4 -left-3 size-10 -rotate-12" />
            <p className="font-display text-2xl md:text-[26px] leading-snug text-ink/90">
              buddy's our in-house barista — half listener, half drink-picker.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-ink/55">
              your mood in → a cup out.
            </p>
          </div>

          <div data-reveal className="md:col-span-2 bg-rose-50 border border-ink/15 p-6 rounded-sm shadow-sm -rotate-[2.5deg] hover:rotate-0 transition-transform flex flex-col gap-3 items-start">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/55">no menu jargon</span>
            <p className="font-display text-xl leading-snug text-ink/90">
              just say "i'm tired", "first date", or "need to focus" — buddy figures the rest out.
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("buddy:open"))}
              className="group relative inline-flex items-center justify-center hover:scale-[1.04] active:scale-[0.97] transition-transform -rotate-[3deg] mt-1"
              aria-label="Open Buddy"
            >
              <svg viewBox="0 0 240 78" className="w-[210px] h-[64px]" fill="none">
                <path
                  d="M 14 38 C 10 14, 64 6, 120 8 C 184 10, 230 14, 230 38 C 230 60, 184 70, 120 68 C 64 66, 18 60, 14 38 Z"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-ink"
                />
                <path d="M 18 41 C 16 18, 68 10, 118 12 C 180 14, 226 20, 226 40"
                  stroke="currentColor" strokeWidth="1.5" opacity="0.55" className="text-ink" />
                <path d="M 22 44 C 56 54, 178 58, 224 42"
                  stroke="currentColor" strokeWidth="1.5" opacity="0.45" className="text-ink" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center gap-2 font-display text-xl text-ink">
                <Svg name="message-cloud" className="size-5" />
                talk to buddy
                <Svg name="arrow-right" className="size-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </section>

      <section ref={ctaRef} className="max-w-4xl mx-auto px-4 md:px-8 mt-32 text-center relative">
        <Svg name="takeaway-coffee" data-reveal className="absolute -top-16 left-1/2 -translate-x-1/2 w-20 h-20" />
        <h2 data-reveal className="font-display text-4xl md:text-6xl leading-tight">
          The kettle is on. <br />
          <span className="text-accent">Your seat's still warm.</span>
        </h2>
        <p data-reveal className="mt-6 italic text-ink/70">No reservations after 3am. Just walk in. We'll find you a corner.</p>
        <Link
          data-reveal
          to="/booking"
          className="mt-10 inline-block px-10 py-4 font-display text-3xl bg-ink text-paper rounded-[2px] hover:scale-105 transition-transform"
        >
          book a slot →
        </Link>
      </section>
    </SiteShell>
  );
}

function IndexRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Index /> : <LandingAuth />;
}

function DoodleButton({
  to,
  variant = "outline",
  children,
}: {
  to: string;
  variant?: "solid" | "outline";
  children: React.ReactNode;
}) {
  const isSolid = variant === "solid";
  return (
    <Link
      to={to}
      className={`group relative inline-flex items-center gap-4 px-10 py-5 font-display text-2xl md:text-3xl ${
        isSolid ? "text-paper" : "text-ink"
      } hover:scale-[1.03] active:scale-[0.98] transition-transform -rotate-[1.5deg]`}
    >
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 320 90"
        preserveAspectRatio="none"
      >
        {isSolid && (
          <path
            d="M10,16 C50,4 110,10 170,7 C220,5 280,8 308,18 C314,38 312,62 304,78 C260,86 200,82 150,84 C90,86 30,82 14,74 C6,58 4,32 10,16 Z"
            fill="currentColor"
            className="text-ink"
          />
        )}
        <path
          d="M10,16 C50,4 110,10 170,7 C220,5 280,8 308,18 C314,38 312,62 304,78 C260,86 200,82 150,84 C90,86 30,82 14,74 C6,58 4,32 10,16 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-ink"
        />
        <path
          d="M14,22 C56,12 116,16 174,12 C222,10 278,14 302,22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
          className="text-ink"
        />
        <path
          d="M18,78 C70,84 140,82 200,82 C250,82 290,80 302,74"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.45"
          className="text-ink"
        />
      </svg>
      <span className="relative z-10 inline-flex items-center gap-4">{children}</span>
    </Link>
  );
}

function LandingAuth() {
  const FEELINGS: { tag: string; title: string; body: string; svg: string; span: string; bg: string }[] = [
    {
      tag: "for the burnout",
      title: "you closed the laptop and the room got loud.",
      body: "the kind of loud that isn't really sound. sitting with it — instead of scrolling through it — is allowed here. take the slow corner.",
      svg: "couch",
      span: "md:col-span-2 md:row-span-2",
      bg: "bg-amber-50",
    },
    {
      tag: "for the deadlines",
      title: "two assignments left. three weeks of sleep debt.",
      body: "no one's keeping score. the booth by the outlet is yours until you breathe again.",
      svg: "stacked-books",
      span: "md:col-span-2",
      bg: "bg-emerald-50",
    },
    {
      tag: "for the in-between",
      title: "the group chat asked how you are. you said fine.",
      body: "you don't have to translate it here. just sit. order what tastes like comfort.",
      svg: "message-cloud",
      span: "md:col-span-2",
      bg: "bg-rose-50",
    },
    {
      tag: "for the quiet weight",
      title: "someone you love texts back less now.",
      body: "you're not making it up. bring the playlist that helps. we'll keep the second cup warm.",
      svg: "headphones",
      span: "md:col-span-3",
      bg: "bg-blue-50",
    },
    {
      tag: "for the in-flux",
      title: "off your meds, on them, somewhere in between.",
      body: "no pressure to be a version of yourself today. the chair just needs sitting in.",
      svg: "sunflowers",
      span: "md:col-span-3",
      bg: "bg-violet-50",
    },
  ];
  const TOP_PICKS = [
    { name: "Ghost Shot Espresso", img: espresso, tag: "most ordered" },
    { name: "Cloudy Cold Brew", img: coldbrew, tag: "fan favourite" },
    { name: "Midnight Matcha", img: matcha, tag: "quiet hours pick" },
  ];
  return (
    <SiteShell>
      <section className="max-w-5xl mx-auto px-4 md:px-8 pt-16 md:pt-20 pb-12 relative">
        <Svg name="moon" className="absolute top-6 right-6 w-24 opacity-25 -rotate-12 hidden md:block pointer-events-none" />
        <Svg name="vinyl" className="absolute -bottom-10 -left-10 w-52 opacity-15 hidden md:block animate-spin-slow pointer-events-none" />

        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">welcome · your afterhours</p>
        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl mt-3 leading-[0.9]">
          a café for<br/><em className="text-accent">your afterhours.</em>
        </h1>
        <Scribble className="w-56 text-accent/60 mt-4" />

        <p className="mt-8 font-serif italic text-xl md:text-2xl max-w-2xl text-ink/80">
          afterhours isn't about the clock — it's the hour after the hard part. after the deadline, the shift, the long day. a quiet seat, a warm cup, room to breathe.
        </p>

        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {[
            { svg: "coffee", title: "slow brews", body: "pour-overs for the unwind." },
            { svg: "open-book", title: "quiet corners", body: "stay as long as you need." },
            { svg: "headphones", title: "soft sets", body: "vinyl, lo-fi, gentle landings." },
          ].map((c) => (
            <div key={c.title} className="bg-white/60 border border-ink/10 p-4 shadow-md hover:rotate-1 transition-transform">
              <Svg name={c.svg} className="w-12 h-12 mb-2 opacity-80" />
              <p className="font-display text-2xl">{c.title}</p>
              <p className="font-serif italic text-sm text-ink/70 mt-1">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 border-t border-ink/10 pt-10">
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-2">section 002 · come as you are</p>
          <h2 className="font-display text-4xl md:text-5xl mb-8">whichever version of you walked in tonight —</h2>
          <div className="grid md:grid-cols-6 auto-rows-fr gap-4">
            {FEELINGS.map((f) => (
              <div
                key={f.title}
                className={`${f.span} ${f.bg} border border-ink/10 p-6 shadow-sm relative overflow-hidden hover:-translate-y-1 transition-transform`}
              >
                <Svg name={f.svg} className="absolute -bottom-4 -right-4 w-28 h-28 opacity-25 pointer-events-none" />
                <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">{f.tag}</p>
                <p className="font-display text-2xl md:text-3xl mt-2 leading-tight">{f.title}</p>
                <p className="font-serif italic text-ink/75 mt-3 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-16 font-display text-3xl md:text-4xl text-ink/80 -rotate-[3deg] text-center leading-snug">
          we are here in your <span className="text-accent font-bold text-4xl md:text-5xl underline decoration-accent/40 decoration-wavy underline-offset-4">afterhours</span>
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <DoodleButton to="/auth" variant="solid">
            <Svg name="coffee" className="size-8" />
            <span>login or register</span>
            <Svg name="arrow-right" className="size-6 group-hover:translate-x-1 transition-transform" />
          </DoodleButton>
          <span className="font-mono text-[11px] uppercase tracking-widest opacity-60">
            pull up a chair to enter the café
          </span>
        </div>
      </section>

      <TornDivider />

      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-24 relative">
        <div className="flex items-end justify-between mb-10 gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">a quick peek</p>
            <h2 className="font-display text-4xl md:text-5xl mt-1">top of the menu</h2>
          </div>
          <Svg name="curve-arrow" className="hidden md:block w-24 -rotate-12 opacity-70" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {TOP_PICKS.map((d, i) => (
            <div
              key={d.name}
              className={`relative bg-white p-3 pb-8 shadow-xl ${i % 2 ? "rotate-[2deg]" : "-rotate-[2deg]"} hover:rotate-0 hover:scale-[1.03] transition-transform`}
            >
              <Svg name="tape" className="absolute -top-5 left-1/2 -translate-x-1/2 w-20 -rotate-2 z-10 pointer-events-none" />
              <img src={d.img} alt={d.name} loading="lazy" className="w-full aspect-square object-cover grayscale-[10%]" />
              <p className="font-display text-xl mt-3 text-center">{d.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent text-center mt-1">{d.tag}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <DoodleButton to="/auth" variant="outline">
            <Svg name="open-book" className="size-6" />
            <span>register or login to see the full menu</span>
            <Svg name="arrow-right" className="size-5 group-hover:translate-x-1 transition-transform" />
          </DoodleButton>
          <span className="font-mono text-[11px] uppercase tracking-widest opacity-60">
            the rest of the menu is waiting inside
          </span>
        </div>
      </section>
    </SiteShell>
  );
}
