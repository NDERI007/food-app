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
  userId: string;
  setUserId: (userId: string | null) => void;

  addItem: (
    product: MenuItem,
    quantity?: number,
    selectedVariant?: ProductVariant,
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;

  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  totalItems: () => number;
  totalPrice: () => number;
}

const getStorageKey = (userId: string) => `cart-storage-${userId || 'guest'}`;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      userId: 'guest', // ✅ default safe value

      setUserId: (newUserId) => {
        const userId = newUserId || 'guest';

        // ✅ Store which user owns the cart
        localStorage.setItem('cart-user-id', userId);

        // ✅ Tell persist to load a different storage bucket
        useCartStore.persist.setOptions({
          name: getStorageKey(userId),
        });

        // ✅ Rehydrate from new bucket (this loads correct cart)
        const stored = localStorage.getItem(getStorageKey(userId));
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            set({ items: parsed.state?.items || [], userId });
            return;
          } catch {
            // fallback if bad data
          }
        }

        // ✅ If no previous cart → start empty (but not clearing once loaded)
        set({ userId, items: [] });
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
          set({
            items: get().items.map((item) =>
              item.cartItemId === cartItemId
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            ),
          });
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
        set({
          items: get().items.filter((item) => item.cartItemId !== cartItemId),
        }),

      updateQuantity: (cartItemId, quantity) =>
        set({
          items:
            quantity <= 0
              ? get().items.filter((item) => item.cartItemId !== cartItemId)
              : get().items.map((item) =>
                  item.cartItemId === cartItemId ? { ...item, quantity } : item,
                ),
        }),

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        ),
    }),
    {
      name: getStorageKey(localStorage.getItem('cart-user-id') || 'guest'),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
