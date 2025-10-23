import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SavedAddress } from '@utils/schemas/address';

interface DeliveryState {
  place: SavedAddress | null;
  deliveryOption: 'delivery' | 'pickup';
  userId: string | null;

  setUserId: (userId: string | null) => void;
  setDeliveryAddress: (place: SavedAddress) => void;
  changeLocation: () => void;
  setDeliveryOption: (option: 'delivery' | 'pickup') => void;
  clearDelivery: () => void;
}

// Custom storage for delivery (per-user or guest)
const createDeliveryStorage = (baseName: string) => {
  return createJSONStorage(() => ({
    getItem: () => {
      const state = localStorage.getItem('delivery-user-id');
      const userId = state ? JSON.parse(state) : null;
      const key = userId ? `${baseName}-${userId}` : `${baseName}-guest`;
      return localStorage.getItem(key);
    },
    setItem: (_key, value) => {
      const state = localStorage.getItem('delivery-user-id');
      const userId = state ? JSON.parse(state) : null;
      const key = userId ? `${baseName}-${userId}` : `${baseName}-guest`;
      localStorage.setItem(key, value);
    },
    removeItem: () => {
      const state = localStorage.getItem('delivery-user-id');
      const userId = state ? JSON.parse(state) : null;
      const key = userId ? `${baseName}-${userId}` : `${baseName}-guest`;
      localStorage.removeItem(key);
    },
  }));
};

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      place: null,
      deliveryOption: 'delivery',
      userId: null,

      setUserId: (userId) => {
        // Store userId separately
        localStorage.setItem('delivery-user-id', JSON.stringify(userId));

        // Clear current data
        set({ userId, place: null });

        // Force re-hydration from new user's storage
        const key = userId
          ? `delivery-storage-${userId}`
          : 'delivery-storage-guest';
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            set({
              place: data.state?.place || null,
              deliveryOption: data.state?.deliveryOption || 'delivery',
            });
          } catch (e) {
            console.error('Failed to load user delivery:', e);
          }
        }
      },

      setDeliveryAddress: (place) => {
        set({ place });
        console.log('✓ Delivery address set:', place.main_text);
      },

      changeLocation: () => {
        // Just clear the place, session token is now managed by sessionTokenManager
        set({ place: null });
        console.log('→ Location change initiated');
      },

      setDeliveryOption: (option) => {
        set({ deliveryOption: option });
        console.log('✓ Delivery option set:', option);
      },

      clearDelivery: () => {
        set({
          place: null,
          deliveryOption: 'delivery',
        });
        console.log('✓ Delivery cleared');
      },
    }),
    {
      name: 'delivery-storage',
      storage: createDeliveryStorage('delivery-storage'),
      partialize: (state) => ({
        place: state.place,
        deliveryOption: state.deliveryOption,
      }),
    },
  ),
);
