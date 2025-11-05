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

// New interface for reorder items from order history
export interface ReorderItem {
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  quantity: number;
  price: number;
  image_url: ImageVariants | null;
  variant_size?: string | null;
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

  // New method for reordering
  reorderItems: (items: ReorderItem[]) => void;

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
      userId: 'guest',

      setUserId: (newUserId) => {
        const userId = newUserId || 'guest';
        localStorage.setItem('cart-user-id', userId);

        useCartStore.persist.setOptions({
          name: getStorageKey(userId),
        });

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

      // New reorder method - converts order history items to cart items
      reorderItems: (reorderItems) => {
        // Clear existing cart first
        set({ items: [] });

        // Convert reorder items to cart items
        const newCartItems: CartItem[] = reorderItems.map((item) => {
          const hasVariant = !!item.variant_id;
          const cartItemId = hasVariant
            ? `${item.product_id}-${item.variant_id}`
            : item.product_id;

          const displayName =
            hasVariant && item.variant_size
              ? `${item.product_name} (${item.variant_size})`
              : item.product_name;

          return {
            cartItemId,
            product_id: item.product_id,
            variantId: hasVariant ? item.variant_id! : undefined,
            name: displayName,
            price: item.price / item.quantity, // Convert total price back to unit price
            image: item.image_url,
            quantity: item.quantity,
          };
        });

        set({ items: newCartItems });
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
