import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CoffeeCup, Star } from "./Doodles";
import { chatWithBuddy } from "@/lib/buddy.functions";

type Msg = { role: "assistant" | "user"; content: string };

const SEED: Msg[] = [
  {
    role: "assistant",
    content:
      "hey. it's buddy. how's your night going? we can talk about anything — your day, that song stuck in your head, or i can pull something nice off the menu. (hindi bhi chalega.)",
  },
];

export function AIBaristaWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = useServerFn(chatWithBuddy);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("buddy:open", handler);
    return () => window.removeEventListener("buddy:open", handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setThinking(true);
    try {
      // Strip the seed greeting so the model sees only real exchanges
      const history = next.filter((m, i) => !(i === 0 && m.role === "assistant" && m.content === SEED[0].content));
      const safeHistory = history.length === 0 ? [{ role: "user" as const, content: text }] : history;
      const { reply } = await chat({ data: { messages: safeHistory } });
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "something broke. try again?";
      setMsgs((m) => [...m, { role: "assistant", content: msg }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[min(92vw,360px)] bg-ink text-paper rounded-sm shadow-2xl border border-ink/40 animate-ink-spread overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-paper/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest">Buddy · the friend at the next table</span>
            </div>
            <button className="font-mono text-xs opacity-60 hover:opacity-100" onClick={() => setOpen(false)}>
              close ×
            </button>
          </div>
          <div ref={scrollRef} className="max-h-80 overflow-y-auto px-4 py-4 space-y-3 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "assistant" ? "" : "flex justify-end"}>
                <div
                  className={
                    m.role === "assistant"
                      ? "bg-white/10 border-l-2 border-accent px-3 py-2 italic max-w-[85%] whitespace-pre-wrap"
                      : "bg-accent/80 text-white px-3 py-2 max-w-[85%] whitespace-pre-wrap"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="bg-white/10 border-l-2 border-accent px-3 py-2 italic max-w-[85%] opacity-70">
                <span className="inline-flex gap-1">
                  <span className="animate-pulse">·</span>
                  <span className="animate-pulse [animation-delay:120ms]">·</span>
                  <span className="animate-pulse [animation-delay:240ms]">·</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-paper/10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !thinking && send()}
              placeholder="say anything…"
              disabled={thinking}
              className="flex-1 bg-transparent border-b border-paper/30 pb-1 text-sm outline-none font-mono focus:border-accent transition-colors"
            />
            <button onClick={send} disabled={thinking} className="font-display text-lg underline decoration-accent disabled:opacity-40">
              {thinking ? "…" : "send"}
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative bg-ink text-paper rounded-full size-16 shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
        aria-label="Open Buddy"
      >
        <CoffeeCup className="size-7" />
        <Star className="absolute -top-2 -right-2 size-5 text-accent animate-paper-float" />
      </button>
    </div>
  );
}