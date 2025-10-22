import type {
  ImageVariants,
  MenuItem,
  ProductVariant,
} from '@utils/schemas/menu';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  cartItemId: string;
  product_id: string;
  variantId?: string;
  name: string;
  price: number;
  image: ImageVariants | null;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  userId: string | null;

  // User context management
  setUserId: (userId: string | null) => void;

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

// Custom storage that uses user-specific keys
const createUserStorage = (baseName: string) => {
  return createJSONStorage(() => ({
    getItem: () => {
      const state = localStorage.getItem('cart-user-id');
      const userId = state ? JSON.parse(state) : null;
      const key = userId ? `${baseName}-${userId}` : `${baseName}-guest`;
      return localStorage.getItem(key);
    },
    setItem: (_key, value) => {
      const state = localStorage.getItem('cart-user-id');
      const userId = state ? JSON.parse(state) : null;
      const key = userId ? `${baseName}-${userId}` : `${baseName}-guest`;
      localStorage.setItem(key, value);
    },
    removeItem: () => {
      const state = localStorage.getItem('cart-user-id');
      const userId = state ? JSON.parse(state) : null;
      const key = userId ? `${baseName}-${userId}` : `${baseName}-guest`;
      localStorage.removeItem(key);
    },
  }));
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      userId: null,

      // Set user ID and reload data from user-specific storage
      setUserId: (userId) => {
        // Store userId separately for storage helper
        localStorage.setItem('cart-user-id', JSON.stringify(userId));

        // Clear current items
        set({ userId, items: [] });

        // Force re-hydration from new user's storage
        const key = userId ? `cart-storage-${userId}` : 'cart-storage-guest';
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            set({ items: data.state?.items || [] });
          } catch (e) {
            console.error('Failed to load user cart:', e);
          }
        }
      },

      addItem: (product, quantity = 1, selectedVariant) => {
        const isVariant = !!selectedVariant;
        const cartItemId = isVariant
          ? `${product.id}-${selectedVariant.id}`
          : product.id;

        const existingItem = get().items.find(
          (item) => item.cartItemId === cartItemId,
        );

        if (existingItem) {
          const updatedItems = get().items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
          set({ items: updatedItems });
          return;
        }

        const newItem: CartItem = {
          cartItemId,
          product_id: product.id,
          variantId: isVariant ? selectedVariant.id : undefined,
          name: isVariant
            ? `${product.name} (${selectedVariant.size_name})`
            : product.name,
          price: isVariant ? selectedVariant.price : product.price,
          image: product.image,
          quantity,
        };

        set({ items: [...get().items, newItem] });
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        })),

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

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      totalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        );
      },
    }),
    {
      name: 'cart-storage',
      storage: createUserStorage('cart-storage'),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
