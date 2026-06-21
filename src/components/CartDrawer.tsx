import { useCartStore } from "@/store/cart";
import { Link } from "@tanstack/react-router";
import { Svg } from "@/lib/svgs";

export function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem } = useCartStore();

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-paper shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="p-6 border-b border-ink/10 flex items-center justify-between bg-paper">
          <h2 className="font-display text-3xl">Your Cart.</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-ink/5 rounded-full transition-colors"
          >
            <Svg name="close" className="size-6" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <div className="text-center mt-20 text-ink/50 italic font-serif">
              your cart is empty.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-display text-xl">{item.name}</p>
                  <p className="font-mono text-sm opacity-60">₹{item.price}</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white border border-ink/10 px-2 py-1 shadow-sm">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-ink/5 text-ink/70"
                  >
                    -
                  </button>
                  <span className="font-mono w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-ink/5 text-ink/70"
                  >
                    +
                  </button>
                </div>
                
                <button 
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                >
                  <Svg name="trash" className="size-5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-ink/10 bg-white">
            <div className="flex justify-between items-center mb-6">
              <span className="font-serif italic text-lg text-ink/70">total</span>
              <span className="font-display text-3xl text-accent">₹{total}</span>
            </div>
            
            <Link 
              to="/checkout"
              onClick={() => setIsOpen(false)}
              className="w-full py-4 bg-ink text-paper font-mono uppercase tracking-widest text-sm flex items-center justify-center hover:bg-ink/90 transition-colors"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
