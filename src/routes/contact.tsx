import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/SiteShell";
import { Scribble, Star, Moon, CoffeeCup, Heart } from "@/components/Doodles";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { submitFeedback } from "@/lib/feedback.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Feedback — AFTERHOURS" },
      { name: "description", content: "Find us, message us, rate the visit, or leave a suggestion." },
      { property: "og:title", content: "Contact & Feedback — AFTERHOURS" },
      { property: "og:description", content: "Find us, message us, rate the visit, or leave a suggestion." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState("");

  const sendFeedback = useServerFn(submitFeedback);
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.1, y: 30 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendFeedback({ data: { name, email, message, rating, suggestion } });
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <SiteShell>
      <section ref={ref} className="max-w-5xl mx-auto px-4 md:px-8 pt-16 pb-12">
        <p data-reveal className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 005 · say hi · drop a note</p>
        <h1 data-reveal className="font-display text-6xl md:text-8xl mt-3">talk to us.</h1>
        <p data-reveal className="italic text-ink/70 mt-3 max-w-xl">
          questions, hellos, late-night thoughts, or how the visit actually felt — it all lands in the same inbox.
        </p>
        <Scribble className="w-40 text-accent/60 mt-2" />

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div data-reveal className="space-y-8">
            <div data-reveal>
              <h3 className="font-display text-3xl">where we live</h3>
              <p className="font-mono text-sm mt-2 leading-relaxed text-ink/80">
                12 Ink Street<br />Gen-Z Lane, Mumbai 400001
              </p>
            </div>
            <div data-reveal>
              <h3 className="font-display text-3xl">hours</h3>
              <ul className="font-mono text-sm mt-2 space-y-1 text-ink/80">
                <li>mon – thu · 5pm — 2am</li>
                <li>fri – sat · 5pm — 4am</li>
                <li>sun · closed (we're recovering)</li>
              </ul>
            </div>
            <div data-reveal>
              <h3 className="font-display text-3xl">find us online</h3>
              <div className="mt-2 flex gap-4 font-mono text-xs uppercase tracking-widest">
                <a href="#" className="underline decoration-accent">instagram</a>
                <a href="#" className="underline decoration-accent">spotify</a>
                <a href="#" className="underline decoration-accent">are.na</a>
              </div>
            </div>

            <div data-reveal className="bg-ink text-paper p-5 max-w-xs flex items-center gap-4 shadow-xl">
              <div className="relative">
                <CoffeeCup className="size-10 text-accent" />
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-accent animate-pulse" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest opacity-60">now playing</p>
                <p className="font-display text-xl">moon river — lofi</p>
              </div>
            </div>
          </div>

          <div data-reveal className="bg-white/60 border border-ink/10 p-8 shadow-lg relative">
            <Moon className="absolute -top-5 -left-5 size-12 text-ink rotate-12 bg-paper p-1.5 rounded-full" />
            {sent ? (
              <div className="text-center py-12 animate-ink-spread">
                <Heart className="size-12 text-accent mx-auto" />
                <p className="font-display text-3xl mt-4">noted. with love.</p>
                <p className="italic text-ink/70 mt-2">we reply between brews.</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <h3 className="font-display text-3xl">write us a note</h3>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" disabled={isSubmitting} className="w-full bg-transparent border-b-2 border-ink/20 focus:border-accent outline-none font-mono text-sm pb-2 disabled:opacity-50" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" disabled={isSubmitting} className="w-full bg-transparent border-b-2 border-ink/20 focus:border-accent outline-none font-mono text-sm pb-2 disabled:opacity-50" />
                <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="what's on your mind?" disabled={isSubmitting} className="w-full bg-transparent border-2 border-ink/20 focus:border-accent outline-none font-mono text-sm p-3 resize-none disabled:opacity-50" />

                <div className="pt-2 border-t border-ink/10">
                  <p className="font-display text-xl mb-3">already visited? rate it.</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        className="transition-transform hover:scale-110"
                        aria-label={`Rate ${n}`}
                      >
                        <Star className={`size-9 ${(hover || rating) >= n ? "text-accent fill-current" : "text-ink/25"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-display text-xl mb-2">a suggestion (optional)</label>
                  <input
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="i wish you had..."
                    disabled={isSubmitting}
                    className="w-full bg-transparent border-b-2 border-ink/20 focus:border-accent outline-none font-mono text-sm pb-2 disabled:opacity-50"
                  />
                </div>

                <button disabled={isSubmitting} className="px-6 py-3 bg-ink text-paper font-display text-2xl hover:scale-105 transition-transform disabled:opacity-50">
                  {isSubmitting ? "..." : "send it →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}