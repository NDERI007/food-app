// 1. Add to your delivery store (deliveryStore.ts)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SavedAddress } from '@utils/schemas/address';

interface DeliveryState {
  place: SavedAddress | null;
  deliveryOption: 'delivery' | 'pickup';
  userId: string;
  setUserId: (userId: string | null) => void;
  setDeliveryAddress: (place: SavedAddress) => void;
  changeLocation: () => void;
  setDeliveryOption: (option: 'delivery' | 'pickup') => void;
  clearDelivery: () => void;

  // NEW: Delivery fee calculation
  getDeliveryFee: (subtotal: number) => number;
}

const DELIVERY_FEE = 20;
const FREE_DELIVERY_THRESHOLD = 150;

const getStorageKey = (userId: string) =>
  `delivery-storage-${userId || 'guest'}`;

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      place: null,
      deliveryOption: 'delivery',
      userId: 'guest',

      setUserId: (newUserId) => {
        const userId = newUserId || 'guest';
        localStorage.setItem('delivery-user-id', userId);
        useDeliveryStore.persist.setOptions({
          name: getStorageKey(userId),
        });

        const stored = localStorage.getItem(getStorageKey(userId));
        if (stored) {
          const parsed = JSON.parse(stored);
          set({
            userId,
            place: parsed.state?.place || null,
            deliveryOption: parsed.state?.deliveryOption || 'delivery',
          });
          return;
        }
        set({ userId });
      },

      setDeliveryAddress: (place) => {
        set({ place });
      },

      changeLocation: () => {
        set({ place: null });
      },

      setDeliveryOption: (option) => {
        set({ deliveryOption: option });
      },

      clearDelivery: () => {
        set({ place: null, deliveryOption: 'delivery' });
      },

      // NEW: Calculate delivery fee based on subtotal
      getDeliveryFee: (subtotal: number) => {
        const state = get();
        // Only charge delivery fee for delivery orders
        if (state.deliveryOption !== 'delivery') {
          return 0;
        }
        // Free delivery for orders >= 150
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
          return 0;
        }
        // Otherwise charge 20
        return DELIVERY_FEE;
      },
    }),
    {
      name: getStorageKey(localStorage.getItem('delivery-user-id') || 'guest'),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        place: state.place,
        deliveryOption: state.deliveryOption,
      }),
    },
  ),
);

// Export constants for use in components
export { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD };
