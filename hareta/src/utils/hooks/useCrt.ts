import type {
  ImageVariants,
  MenuItem,
  ProductVariant,
} from '@utils/schemas/menu';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  cartItemId: string; // Unique ID, e.g., "prod1-variant2" or just "prod2"
  product_id: string;
  variantId?: string; // Optional, only exists if it's a variant
  name: string; // e.g., "Pizza (Large)" or "Water Bottle"
  price: number; // The final price of this specific item
  image: ImageVariants | string | null;
  quantity: number;
}

interface CartStore {
  // State
  items: CartItem[];
  isOpen: boolean;

  // Cart Actions
  addItem: (
    product: MenuItem,
    quantity?: number,
    selectedVariant?: ProductVariant,
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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial State
      items: [],
      isOpen: false,

      // Add item to cart with quantity and options
      addItem: (product, quantity = 1, selectedVariant) => {
        // 1. Determine the unique ID and details for the cart item
        const isVariant = !!selectedVariant;
        const cartItemId = isVariant
          ? `${product.id}-${selectedVariant.id}`
          : product.id;

        const existingItem = get().items.find(
          (item) => item.cartItemId === cartItemId,
        );

        // 2. If the item already exists, just update its quantity
        if (existingItem) {
          const updatedItems = get().items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
          set({ items: updatedItems });
          return; // Stop execution
        }

        // 3. If it's a new item, create it
        const newItem: CartItem = {
          cartItemId,
          product_id: product.id,
          variantId: isVariant ? selectedVariant.id : undefined,
          name: isVariant
            ? `${product.name} (${selectedVariant.size_name})` // e.g., "Pizza (Large)"
            : product.name,
          // Price is now direct, not calculated!
          price: isVariant ? selectedVariant.price : product.price,
          image: product.image,
          quantity,
        };

        set({ items: [...get().items, newItem] });
      },

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
