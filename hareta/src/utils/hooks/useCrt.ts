// stores/useCartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SelectedChoice {
  optionId: string;
  choiceId: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  selectedChoices?: SelectedChoice[];
  cartItemId: string; // Unique identifier for this specific variation
}

interface CartStore {
  // State
  items: CartItem[];
  isOpen: boolean;

  // Cart Actions
  addItem: (
    product: Omit<CartItem, 'quantity' | 'cartItemId'>,
    quantity?: number,
    selectedChoices?: SelectedChoice[],
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;

  // UI Actions
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed
  totalItems: () => number;
  totalPrice: () => number;
}

// Helper to calculate price with option deltas
function calculateItemPrice(
  basePrice: number,
  product: any,
  selectedChoices?: SelectedChoice[],
): number {
  if (!selectedChoices || !product.options) return basePrice;

  let totalPrice = basePrice;

  selectedChoices.forEach((selected) => {
    const option = product.options.find(
      (opt: any) => opt.id === selected.optionId,
    );
    if (option) {
      const choice = option.choices.find(
        (c: any) => c.id === selected.choiceId,
      );
      if (choice && choice.priceDelta) {
        totalPrice += choice.priceDelta;
      }
    }
  });

  return totalPrice;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial State
      items: [],
      isOpen: false,

      // Add item to cart with quantity and options
      addItem: (product, quantity = 1, selectedChoices = []) =>
        set((state) => {
          // Generate unique ID for this specific variation
          const cartItemId = `${product.id}-${JSON.stringify(selectedChoices || [])}`;

          // Find existing item with same product + same choices
          const existingItem = state.items.find(
            (item) => item.cartItemId === cartItemId,
          );

          // Calculate final price including option deltas
          const finalPrice = calculateItemPrice(
            product.price,
            product,
            selectedChoices,
          );

          if (existingItem) {
            // Same product + same choices = increment quantity
            return {
              items: state.items.map((item) =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }

          // New item or different variation
          return {
            items: [
              ...state.items,
              {
                ...product,
                price: finalPrice, // Use calculated price
                quantity,
                selectedChoices,
                cartItemId,
              },
            ],
          };
        }),

      // Remove item completely from cart
      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        })),

      // Update item quantity (or remove if quantity is 0)
      updateQuantity: (cartItemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) => item.cartItemId !== cartItemId,
              ),
            };
          }

          return {
            items: state.items.map((item) =>
              item.cartItemId === cartItemId ? { ...item, quantity } : item,
            ),
          };
        }),

      // Clear entire cart
      clearCart: () => set({ items: [] }),

      // Toggle cart drawer
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Open cart drawer
      openCart: () => set({ isOpen: true }),

      // Close cart drawer
      closeCart: () => set({ isOpen: false }),

      // Get total number of items
      totalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      // Get total price
      totalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        );
      },
    }),
    {
      name: 'cart-storage', // localStorage key
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
