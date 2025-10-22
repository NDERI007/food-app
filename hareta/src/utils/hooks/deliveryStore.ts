import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { SavedAddress } from '@utils/schemas/address';

interface DeliveryState {
  place: SavedAddress | null;
  sessionToken: string;
  deliveryOption: 'delivery' | 'pickup';
  userId: string | null;

  setUserId: (userId: string | null) => void;
  setDeliveryAddress: (place: SavedAddress, sessionToken?: string) => void;
  changeLocation: () => void;
  setDeliveryOption: (option: 'delivery' | 'pickup') => void;
  clearDelivery: () => void;
}

// Custom storage for delivery
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
    (set, get) => ({
      place: null,
      sessionToken: uuidv4(),
      deliveryOption: 'delivery',
      userId: null,

      setUserId: (userId) => {
        // Store userId separately
        localStorage.setItem('delivery-user-id', JSON.stringify(userId));

        // Clear current data
        set({ userId, place: null, sessionToken: uuidv4() });

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

      setDeliveryAddress: (place, sessionToken) => {
        set({
          place,
          sessionToken: sessionToken || get().sessionToken,
        });
        console.log('✓ Delivery address set:', place.main_text);
      },

      changeLocation: () => {
        const newToken = uuidv4();
        set({ sessionToken: newToken });
        console.log('→ New search session started');
      },

      setDeliveryOption: (option) => {
        set({ deliveryOption: option });
        console.log('✓ Delivery option set:', option);
      },

      clearDelivery: () => {
        set({
          place: null,
          sessionToken: uuidv4(),
          deliveryOption: 'delivery',
        });
        console.log('✓ Delivery cleared, new session token generated');
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
