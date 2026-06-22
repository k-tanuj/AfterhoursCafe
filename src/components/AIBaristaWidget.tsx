import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CoffeeCup, Star } from "./Doodles";
import { chatWithBuddy, getChatHistory } from "@/lib/buddy.functions";


import { useAuth } from "@/hooks/use-auth";

type Msg = { role: "assistant" | "user" | "system"; content: string };

const SEED: Msg[] = [
  {
    role: "assistant",
    content: "hey. it's buddy. how's your night going? we can talk about anything — your day, that song stuck in your head, or i can pull something nice off the menu. (hindi bhi chalega.)",
  },
];

const QUICK_REPLIES = [
  "make a table reservation 📅",
  "show me your menu 📜",
  "want to order something ☕",
  "whats in my cart 🛒",
];

export function AIBaristaWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chat = useServerFn(chatWithBuddy);
  const fetchHistory = useServerFn(getChatHistory);

  // Open handler
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("buddy:open", handler);
    return () => window.removeEventListener("buddy:open", handler);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  // Load history when opened for the first time
  useEffect(() => {
    if (open && user && !hasLoadedHistory) {
      setHasLoadedHistory(true);
      fetchHistory().then((history) => {
        if (history && history.length > 0) {
          // If there's history, we replace SEED entirely
          setMsgs(history);
        }
      }).catch(console.error);
    }
  }, [open, user, hasLoadedHistory, fetchHistory]);

  async function send(textStr?: string) {
    const text = textStr ?? input.trim();
    if (!text || thinking) return;

    if (text === "whats in my cart 🛒") {
      setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "I can't check your cart right now, but you can view it by clicking the floating cart button on the screen!" }]);
      setInput("");
      return;
    }

    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setThinking(true);
    
    try {
      // Send only the new message to the backend; it fetches history internally
      const { reply } = await chat({ data: { message: text } });
      
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);

    } catch (e) {
      const msg = e instanceof Error ? e.message : "something broke. try again?";
      setMsgs((m) => [...m, { role: "assistant", content: msg }]);
    } finally {
      setThinking(false);
    }
  }

  // If not logged in, don't show the widget at all
  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      {open && (
        <div className="mb-4 w-[min(95vw,420px)] bg-paper/95 backdrop-blur-xl text-ink rounded-2xl shadow-2xl shadow-accent/10 border border-ink/10 animate-in slide-in-from-bottom-5 fade-in duration-300 overflow-hidden flex flex-col h-[min(80vh,600px)]">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 px-5 py-4 bg-ink/5 border-b border-ink/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <CoffeeCup className="size-6 text-accent" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-paper animate-pulse" />
              </div>
              <div>
                <h3 className="font-display text-lg leading-none">Buddy</h3>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">AI Companion</span>
              </div>
            </div>
            <button className="p-2 -mr-2 opacity-60 hover:opacity-100 hover:bg-ink/10 rounded-full transition-colors" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          {/* Chat History */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 text-sm scrollbar-thin scrollbar-thumb-ink/10">
            {msgs.map((m, i) => {
              if (m.role === "system") return null; // Hide system tool notes
              const isAssistant = m.role === "assistant";
              return (
                <div key={i} className={isAssistant ? "flex flex-col items-start w-full overflow-hidden" : "flex flex-col items-end w-full overflow-hidden"}>
                    <div
                    className={
                      isAssistant
                        ? "bg-white border border-ink/10 text-ink rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-sm"
                        : "bg-accent text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-md"
                    }
                  >
                    {m.content}
                  </div>
                  
                  <span className="font-mono text-[9px] opacity-40 mt-1.5 px-1 uppercase">
                    {isAssistant ? "Buddy" : "You"}
                  </span>
                </div>
              );
            })}
            
            {thinking && (
              <div className="flex flex-col items-start">
                <div className="bg-white border border-ink/10 rounded-2xl rounded-tl-sm px-4 py-4 max-w-[85%] shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 bg-white/50 border-t border-ink/10 p-4">
            {/* Quick Replies */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-none snap-x">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => send(qr)}
                  disabled={thinking}
                  className="whitespace-nowrap snap-start px-3 py-1.5 rounded-full bg-ink/5 border border-ink/10 text-xs font-mono text-ink/80 hover:bg-ink/10 transition-colors disabled:opacity-30"
                >
                  {qr}
                </button>
              ))}
            </div>

            <div className="relative flex items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !thinking && send()}
                placeholder="Message Buddy..."
                disabled={thinking}
                className="w-full bg-white border border-ink/20 rounded-full pl-5 pr-12 py-3 text-sm text-ink outline-none focus:border-accent/50 focus:bg-white focus:ring-2 focus:ring-accent/10 transition-all placeholder:opacity-40 shadow-sm"
              />
              <button 
                onClick={() => send()} 
                disabled={thinking || !input.trim()} 
                className="absolute right-2 p-2 rounded-full bg-accent text-white disabled:opacity-40 hover:scale-105 transition-transform"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group relative bg-ink text-paper rounded-full size-16 shadow-2xl hover:scale-105 transition-transform flex items-center justify-center animate-in zoom-in duration-300"
          aria-label="Open Buddy"
        >
          <CoffeeCup className="size-7" />
          <Star className="absolute -top-1 -right-1 size-5 text-accent animate-paper-float drop-shadow-md" />
          {/* Notification Dot */}
          <span className="absolute top-0 right-0 size-3 rounded-full bg-red-500 border-2 border-ink" />
        </button>
      )}
    </div>
  );
}