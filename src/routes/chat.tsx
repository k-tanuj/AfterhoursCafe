import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CoffeeCup, Star } from "@/components/Doodles";
import { chatWithBuddy, getChatHistory } from "@/lib/buddy.functions";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/store/cart";

export const Route = createFileRoute("/chat")({
  component: ChatRoute,
});

type Msg = { role: "assistant" | "user" | "system"; content: string };

const SEED: Msg[] = [
  {
    role: "assistant",
    content: "hey. it's buddy. how's your night going? we can talk about anything — your day, that song stuck in your head, or i can pull something nice off the menu. (hindi bhi chalega.)",
  },
];

const QUICK_REPLIES = [
  "Surprise me 🎲",
  "I need caffeine ☕",
  "Something sweet 🍰",
  "Show my cart 🛒",
];

function ChatRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chat = useServerFn(chatWithBuddy);
  const fetchHistory = useServerFn(getChatHistory);
  const addToCart = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      navigate({ to: "/auth" });
    }
  }, [user, navigate]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  // Load history on mount
  useEffect(() => {
    if (user && !hasLoadedHistory) {
      setHasLoadedHistory(true);
      fetchHistory().then((history) => {
        if (history && history.length > 0) {
          setMsgs(history);
        }
      }).catch(console.error);
    }
  }, [user, hasLoadedHistory, fetchHistory]);

  async function send(textStr?: string) {
    const text = textStr ?? input.trim();
    if (!text || thinking) return;

    if (text === "Show my cart 🛒") {
      const cartSummary = cartItems.length === 0 
        ? "Your cart is totally empty right now." 
        : `You have ${cartItems.length} items in your cart:\n` + cartItems.map(i => `- ${i.quantity}x ${i.name}`).join('\n');
      
      setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: cartSummary }]);
      setInput("");
      return;
    }

    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setThinking(true);
    
    try {
      const { reply, toolCalls } = await chat({ data: { message: text } });
      
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);

      if (toolCalls) {
        for (const tc of toolCalls) {
          if (tc.toolName === "addToCart" && tc.args) {
            const { itemId, quantity, itemName } = tc.args;
            addToCart({
              id: itemId,
              name: itemName,
              price: 0, 
            } as any); 
            window.dispatchEvent(new CustomEvent('cart:add', { detail: { id: itemId, name: itemName, quantity }}));
          }
        }
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : "something broke. try again?";
      setMsgs((m) => [...m, { role: "assistant", content: msg }]);
    } finally {
      setThinking(false);
    }
  }

  if (!user) return <div className="min-h-screen bg-paper flex items-center justify-center font-display text-ink text-2xl">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col pt-20">
      
      <div className="flex-1 flex flex-col w-full h-[calc(100vh-5rem)]">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 px-8 py-5 bg-ink/5 border-b border-ink/10 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <CoffeeCup className="size-10 text-accent" />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-paper animate-pulse" />
            </div>
            <div>
              <h3 className="font-display text-3xl leading-none">Buddy</h3>
              <span className="font-mono text-xs uppercase tracking-widest opacity-60">Your Afterhours Companion</span>
            </div>
          </div>
        </div>

        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-10 space-y-8 text-lg scrollbar-thin scrollbar-thumb-ink/10 bg-white/30 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            {msgs.map((m, i) => {
              if (m.role === "system") return null; 
              const isAssistant = m.role === "assistant";
              return (
                <div key={i} className={isAssistant ? "flex flex-col items-start" : "flex flex-col items-end"}>
                  <div
                    className={
                      isAssistant
                        ? "bg-white border border-ink/10 text-ink rounded-3xl rounded-tl-sm px-6 py-5 max-w-[75%] whitespace-pre-wrap leading-relaxed shadow-sm"
                        : "bg-accent text-white rounded-3xl rounded-tr-sm px-6 py-5 max-w-[75%] whitespace-pre-wrap leading-relaxed shadow-sm"
                    }
                  >
                    {m.content}
                  </div>
                  <span className="font-mono text-xs opacity-40 mt-2 px-2 uppercase tracking-wider">
                    {isAssistant ? "Buddy" : "You"}
                  </span>
                </div>
              );
            })}
            
            {thinking && (
              <div className="flex flex-col items-start">
                <div className="bg-white border border-ink/10 rounded-3xl rounded-tl-sm px-8 py-6 max-w-[75%] shadow-sm">
                  <div className="flex gap-2.5 items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" />
                    <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 bg-white border-t border-ink/10 p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-6xl mx-auto w-full">
            {/* Quick Replies */}
            <div className="flex gap-3 overflow-x-auto pb-4 mb-2 scrollbar-none snap-x">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => send(qr)}
                  disabled={thinking}
                  className="whitespace-nowrap snap-start px-5 py-2.5 rounded-full bg-ink/5 border border-ink/10 text-base font-mono text-ink/80 hover:bg-ink/10 transition-colors disabled:opacity-40 shadow-sm"
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
                className="w-full bg-paper border border-ink/20 rounded-full pl-8 pr-16 py-5 text-lg text-ink outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all placeholder:opacity-40 shadow-inner"
              />
              <button 
                onClick={() => send()} 
                disabled={thinking || !input.trim()} 
                className="absolute right-3 p-4 rounded-full bg-accent text-white disabled:opacity-40 hover:scale-105 transition-transform shadow-md flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <Star className="absolute top-24 right-12 size-12 text-accent/10 animate-spin-slow pointer-events-none" />
        <Star className="absolute bottom-40 left-12 size-8 text-accent/10 animate-spin-slow pointer-events-none" />
      </div>
    </div>
  );
}
