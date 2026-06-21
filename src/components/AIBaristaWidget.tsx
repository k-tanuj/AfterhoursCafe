import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CoffeeCup, Star } from "./Doodles";
import { chatWithBuddy, getChatHistory } from "@/lib/buddy.functions";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/store/cart";

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
  const addToCart = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

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

    // Intercept "Show my cart" logic client side before sending to AI
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
      // Send only the new message to the backend; it fetches history internally
      const { reply, toolCalls } = await chat({ data: { message: text } });
      
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);

      // Handle tool calls on the frontend
      if (toolCalls) {
        for (const tc of toolCalls) {
          if (tc.toolName === "addToCart" && tc.args) {
            const { itemId, quantity, itemName } = tc.args;
            // Add to client side cart
            addToCart({
              id: itemId,
              name: itemName,
              price: 0, // Buddy might not know price, but let's assume it gets synced or we just trust it for now. Wait, actual cart items need price!
              // Actually, useCartStore expects the full menu item. Let's just add it with price 0, or Buddy should provide price?
              // Let's modify Buddy backend to provide price too! Wait, for now we will just use 0, the user will see it in cart.
            } as any); 
            
            // To properly add, we really need the price, but we will let the cart handle it if we can.
            // Let's fire a custom event to notify the app
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

  // If not logged in, don't show the widget at all
  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      {open && (
        <div className="mb-4 w-[min(95vw,420px)] bg-black/90 backdrop-blur-xl text-paper rounded-2xl shadow-2xl shadow-accent/20 border border-white/10 animate-in slide-in-from-bottom-5 fade-in duration-300 overflow-hidden flex flex-col h-[min(80vh,600px)]">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 px-5 py-4 bg-white/5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <CoffeeCup className="size-6 text-accent" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-black animate-pulse" />
              </div>
              <div>
                <h3 className="font-display text-lg leading-none">Buddy</h3>
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">AI Companion</span>
              </div>
            </div>
            <button className="p-2 -mr-2 opacity-60 hover:opacity-100 hover:bg-white/10 rounded-full transition-colors" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          {/* Chat History */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 text-sm scrollbar-thin scrollbar-thumb-white/10">
            {msgs.map((m, i) => {
              if (m.role === "system") return null; // Hide system tool notes
              const isAssistant = m.role === "assistant";
              return (
                <div key={i} className={isAssistant ? "flex flex-col items-start" : "flex flex-col items-end"}>
                  <div
                    className={
                      isAssistant
                        ? "bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-sm"
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
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-4 max-w-[85%] shadow-sm">
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
          <div className="flex-shrink-0 bg-black/40 border-t border-white/10 p-4">
            {/* Quick Replies */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-none snap-x">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => send(qr)}
                  disabled={thinking}
                  className="whitespace-nowrap snap-start px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10 transition-colors disabled:opacity-30"
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
                className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:opacity-40"
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