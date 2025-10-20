import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { SavedAddress } from '@utils/schemas/address';

interface DeliveryState {
  // Current delivery info
  place: SavedAddress | null;
  sessionToken: string;
  deliveryOption: 'delivery' | 'pickup';

  // Actions
  setDeliveryAddress: (place: SavedAddress, sessionToken?: string) => void;
  changeLocation: () => void;
  setDeliveryOption: (option: 'delivery' | 'pickup') => void;
  clearDelivery: () => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      // Initial state
      place: null,
      sessionToken: uuidv4(),
      deliveryOption: 'delivery',

      // Set delivery address (from hero search or address change)
      setDeliveryAddress: (place, sessionToken) => {
        set({
          place,
          // Use provided token OR keep existing one (for same search session)
          sessionToken: sessionToken || get().sessionToken,
        });
        console.log('✓ Delivery address set:', place.main_text);
      },

      // User wants to change location - generate NEW session token
      changeLocation: () => {
        const newToken = uuidv4();
        set({
          sessionToken: newToken,
        });
        console.log('→ New search session started');
      },

      // Set delivery or pickup
      setDeliveryOption: (option) => {
        set({ deliveryOption: option });
        console.log('✓ Delivery option set:', option);
      },

      // Clear delivery info (e.g., after order completed)
      clearDelivery: () => {
        set({
          place: null,
          sessionToken: uuidv4(), // New token for next order
          deliveryOption: 'delivery',
        });
        console.log('✓ Delivery cleared, new session token generated');
      },
    }),
    {
      name: 'delivery-storage', // localStorage key
      // Only persist address and deliveryOption, not sessionToken
      partialize: (state) => ({
        place: state.place,
        deliveryOption: state.deliveryOption,
      }),
    },
  ),
);
