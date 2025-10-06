import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Place {
  place_id?: string | null;
  name?: string;
  description?: string;
  main_text?: string;
  secondary_text?: string;
  source?: string;
  room?: string;
}

interface DeliveryState {
  // Current delivery info
  address: string;
  place: Place | null;
  sessionToken: string;
  deliveryOption: 'delivery' | 'pickup';

  // Actions
  setDeliveryAddress: (
    address: string,
    place: Place,
    sessionToken?: string,
  ) => void;
  changeLocation: () => void;
  setDeliveryOption: (option: 'delivery' | 'pickup') => void;
  clearDelivery: () => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      // Initial state
      address: '',
      place: null,
      sessionToken: uuidv4(),
      deliveryOption: 'delivery',

      // Set delivery address (from hero search or address change)
      setDeliveryAddress: (address, place, sessionToken) => {
        set({
          address,
          place,
          // Use provided token OR keep existing one (for same search session)
          sessionToken: sessionToken || get().sessionToken,
        });
        console.log(
          '✓ Delivery address set:',
          address,
          'Token:',
          get().sessionToken,
        );
      },

      // User wants to change location - generate NEW session token
      changeLocation: () => {
        const newToken = uuidv4();
        set({
          sessionToken: newToken,
        });
        console.log('→ New search session started. Token:', newToken);
      },

      // Set delivery or pickup
      setDeliveryOption: (option) => {
        set({ deliveryOption: option });
        console.log('✓ Delivery option set:', option);
      },

      // Clear delivery info (e.g., after order completed)
      clearDelivery: () => {
        set({
          address: '',
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
        address: state.address,
        place: state.place,
        deliveryOption: state.deliveryOption,
      }),
    },
  ),
);
