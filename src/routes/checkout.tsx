import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCartStore } from "@/store/cart";
import { useServerFn } from "@tanstack/react-start";
import { submitCustomerOrder } from "@/lib/orders.functions";
import { toast } from "sonner";
import { SiteShell } from "@/components/SiteShell";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const navigate = useNavigate();
  const doSubmitOrder = useServerFn(submitCustomerOrder);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const totalAmount = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await doSubmitOrder({
        data: {
          name,
          email,
          amount: totalAmount,
          date: today,
          items,
        },
      });

      if (res.success) {
        clearCart();
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccessModal) {
    return (
      <SiteShell>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-paper border border-ink/20 p-8 shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
            <h2 className="font-display text-4xl text-accent mb-4">Order Placed!</h2>
            <p className="font-mono text-sm opacity-80 mb-8 leading-relaxed">
              Your order has been sent to our kitchen.<br /><br />
              Please proceed to the counter and provide your name (<strong>{name}</strong>) to get your bill and pay.
            </p>
            <button
              onClick={() => navigate({ to: "/menu" })}
              className="w-full px-6 py-4 bg-ink text-paper font-mono uppercase text-sm tracking-widest hover:bg-ink/90 transition-colors"
            >
              Return to Menu
            </button>
          </div>
        </div>
      </SiteShell>
    );
  }

  if (items.length === 0) {
    return (
      <SiteShell>
        <div className="max-w-3xl mx-auto pt-32 pb-24 px-6 min-h-[70vh] flex flex-col items-center justify-center">
          <h1 className="font-display text-4xl mb-6">Your cart is empty.</h1>
          <button
            onClick={() => navigate({ to: "/menu" })}
            className="px-6 py-3 bg-ink text-paper font-mono uppercase text-sm tracking-widest hover:bg-ink/90 transition-colors"
          >
            Go to Menu
          </button>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="max-w-3xl mx-auto pt-32 pb-24 px-6">
        <h1 className="font-display text-5xl mb-12">Checkout.</h1>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div>
            <h2 className="font-display text-2xl mb-6">Order Summary</h2>
            <div className="bg-white/60 p-6 border border-ink/10 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center font-mono text-sm"
                >
                  <div className="flex-1">
                    <span className="font-bold">{item.name}</span> x{" "}
                    {item.quantity}
                  </div>
                  <div>₹{item.price * item.quantity}</div>
                </div>
              ))}
              <div className="pt-4 border-t border-ink/10 flex justify-between items-center">
                <span className="font-serif italic text-lg opacity-70">Total</span>
                <span className="font-display text-2xl text-accent">
                  ₹{totalAmount}
                </span>
              </div>
            </div>
            <p className="mt-6 text-sm opacity-70 font-mono">
              Note: Payment is collected in-person at the cafe. No online
              payment is required right now.
            </p>
          </div>

          {/* Details Form */}
          <div>
            <h2 className="font-display text-2xl mb-6">Your Details</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <label className="flex flex-col gap-2">
                <span className="font-mono text-xs uppercase tracking-widest opacity-60">
                  Full Name
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="bg-white/60 border border-ink/15 px-4 py-3 font-mono text-sm focus:outline-none focus:border-accent w-full"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-mono text-xs uppercase tracking-widest opacity-60">
                  Email Address
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane@example.com"
                  className="bg-white/60 border border-ink/15 px-4 py-3 font-mono text-sm focus:outline-none focus:border-accent w-full"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-accent text-paper font-display text-2xl hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Place Order →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
