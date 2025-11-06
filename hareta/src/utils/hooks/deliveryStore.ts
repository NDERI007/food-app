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
}

const getStorageKey = (userId: string) =>
  `delivery-storage-${userId || 'guest'}`;

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      place: null,
      deliveryOption: 'delivery',
      userId: 'guest', // ✅ always start as guest, stable

      setUserId: (newUserId) => {
        const userId = newUserId || 'guest';

        // ✅ Mark which user owns current delivery data
        localStorage.setItem('delivery-user-id', userId);

        // ✅ Make persist read/write from correct bucket
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

        // ✅ If no stored state → just adopt userId, do not clear anything
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
