import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique ID in cart (e.g. menu_item_id + modifiers)
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  customization?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addItem: (item) => set((state) => {
        const uniqueId = item.customization ? `${item.menu_item_id}-${item.customization}` : item.menu_item_id;
        const existing = state.items.find(i => i.id === uniqueId);
        if (existing) {
          return {
            items: state.items.map(i => 
              i.id === uniqueId ? { ...i, quantity: i.quantity + (item as any).quantity || 1 } : i
            ),
            isOpen: true
          };
        }
        return {
          items: [...state.items, { ...item, id: uniqueId, quantity: (item as any).quantity || 1 }],
          isOpen: true
        };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      updateQuantity: (id, delta) => set((state) => ({
        items: state.items.map(i => {
          if (i.id === id) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : i;
          }
          return i;
        })
      })),
      clearCart: () => set({ items: [] }),
      setIsOpen: (isOpen) => set({ isOpen }),
    }),
    {
      name: 'afterhours-cart-storage',
      partialize: (state) => ({ items: state.items }), // Only persist the items, not the isOpen state
    }
  )
);
