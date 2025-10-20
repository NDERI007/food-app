import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { Place } from './deliveryStore';
import type { CartItem } from './useCrt';

// Define the types for the payment methods
export type PaymentMethod = 'mpesa' | 'cash_on_delivery';
export type CheckoutStep = 'address' | 'payment' | 'confirmation';

export interface SavedAddress {
  id: string;
  place_id: string;
  main_text: string;
  secondary_text: string;
  lat?: number;
  lng?: number;
}

export interface OrderItem {
  product_id: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
}

interface CheckoutStore {
  // State
  currentStep: CheckoutStep;
  selectedAddressId: string | null;
  savedAddresses: SavedAddress[];
  orderItems: OrderItem[];
  selectedPaymentMethod: PaymentMethod;
  mpesaPhoneNumber: string;

  // Loading and Error states
  isValidatingAddress: boolean;
  isCreatingOrder: boolean;
  isLoadingAddresses: boolean;
  orderId: string | null;
  orderError: string | null;

  // Actions
  setStep: (step: CheckoutStep) => void;
  selectAddress: (addressId: string) => void;
  loadSavedAddresses: () => Promise<void>;
  addSavedAddress: (
    address: Place,
    sessionToken: string,
    label: string,
  ) => Promise<void>;
  deleteSavedAddress: (addressId: string) => Promise<void>;
  initializeCheckout: (items: CartItem[]) => void;
  createOrder: (sessionToken: string) => Promise<boolean>;
  resetCheckout: () => void;

  // NEW: Actions for payment
  selectPaymentMethod: (method: PaymentMethod) => void;
  setMpesaPhoneNumber: (phone: string) => void;

  // NEW: Computed properties for convenience
  computed: {
    selectedAddress: SavedAddress | undefined;
  };
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set, get) => ({
      // Initial State
      currentStep: 'address',
      selectedAddressId: null,
      savedAddresses: [],
      orderItems: [],
      selectedPaymentMethod: 'cash_on_delivery', // Default payment method
      mpesaPhoneNumber: '',
      isValidatingAddress: false,
      isCreatingOrder: false,
      isLoadingAddresses: false,
      orderId: null,
      orderError: null,

      // --- Actions ---

      setStep: (step) => set({ currentStep: step }),
      selectAddress: (addressId) => set({ selectedAddressId: addressId }),

      // NEW: Payment actions
      selectPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
      setMpesaPhoneNumber: (phone) => set({ mpesaPhoneNumber: phone.trim() }),

      loadSavedAddresses: async () => {
        set({ isLoadingAddresses: true, orderError: null });
        try {
          const { data } = await axios.get('/api/addresses', {
            withCredentials: true,
          });
          if (data.success && data.addresses) {
            set({ savedAddresses: data.addresses });
          }
        } catch (error) {
          console.error('Failed to load addresses:', error);
          set({ orderError: 'Failed to load saved addresses' });
        } finally {
          set({ isLoadingAddresses: false });
        }
      },

      addSavedAddress: async (address, sessionToken) => {
        set({ orderError: null });
        try {
          const { data } = await axios.post(
            '/api/addresses',
            {
              place_id: address.place_id,
              main_text: address.main_text,
              secondary_text: address.secondary_text,
              sessionToken,
            },
            { withCredentials: true },
          );
          if (data.success && data.address) {
            set((state) => ({
              savedAddresses: [...state.savedAddresses, data.address],
            }));
          }
        } catch (error) {
          console.error('Failed to add address:', error);
          set({ orderError: 'Failed to save address' });
        }
      },

      deleteSavedAddress: async (addressId) => {
        try {
          await axios.delete(`/api/addresses/${addressId}`, {
            withCredentials: true,
          });
          set((state) => ({
            savedAddresses: state.savedAddresses.filter(
              (addr) => addr.id !== addressId,
            ),
            selectedAddressId:
              state.selectedAddressId === addressId
                ? null
                : state.selectedAddressId,
          }));
        } catch (error) {
          console.error('Failed to delete address:', error);
          set({ orderError: 'Failed to delete address' });
        }
      },

      initializeCheckout: (items) => {
        const orderItems: OrderItem[] = items.map((item) => ({
          product_id: item.product_id,
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }));
        set({
          orderItems,
          currentStep: 'address',
          orderId: null,
          orderError: null,
        });
      },

      /**
       * REFACTORED: Creates an order using the state within the store.
       */
      createOrder: async (sessionToken) => {
        const {
          orderItems,
          computed: { selectedAddress }, // Use the computed property
          selectedPaymentMethod,
          mpesaPhoneNumber,
        } = get();

        // --- Validation ---
        if (!selectedAddress) {
          set({ orderError: 'Please select a delivery address.' });
          return false;
        }
        if (orderItems.length === 0) {
          set({ orderError: 'Your cart is empty.' });
          return false;
        }
        if (selectedPaymentMethod === 'mpesa' && !mpesaPhoneNumber) {
          set({ orderError: 'Please enter your M-Pesa phone number.' });
          return false;
        }

        set({ isCreatingOrder: true, orderError: null });

        try {
          // --- Geocode address if needed ---
          let validatedAddress = selectedAddress;
          if (!selectedAddress.lat || !selectedAddress.lng) {
            set({ isValidatingAddress: true });
            const { data } = await axios.post('/api/places/place-details', {
              placeId: selectedAddress.place_id,
              sessionToken,
            });
            set({ isValidatingAddress: false });
            if (!data.success || !data.address?.lat) {
              throw new Error('Could not validate the delivery address.');
            }
            validatedAddress = { ...selectedAddress, ...data.address };
          }

          // --- Construct Payment Payload ---
          const paymentPayload = {
            method: selectedPaymentMethod,
            ...(selectedPaymentMethod === 'mpesa' && {
              phoneNumber: mpesaPhoneNumber,
            }),
          };

          // --- API Call ---
          const { data } = await axios.post(
            '/api/orders/create',
            {
              delivery_address: validatedAddress,
              items: orderItems,
              payment: paymentPayload, // Send the structured payment data
            },
            { withCredentials: true },
          );

          if (!data.success || !data.orderId) {
            throw new Error(data.message || 'Failed to create order');
          }

          set({
            orderId: data.orderId,
            currentStep: 'confirmation',
          });
          return true;
        } catch (error) {
          set({
            orderError:
              error instanceof Error
                ? error.message
                : 'An unknown error occurred',
          });
          return false;
        } finally {
          set({ isCreatingOrder: false });
        }
      },

      resetCheckout: () =>
        set({
          currentStep: 'address',
          selectedAddressId: get().selectedAddressId, // Keep selected address
          orderItems: [],
          orderId: null,
          orderError: null,
          selectedPaymentMethod: 'cash_on_delivery',
          mpesaPhoneNumber: '',
        }),

      // --- Computed State ---
      computed: {
        get selectedAddress() {
          const { savedAddresses, selectedAddressId } = get();
          return savedAddresses.find((addr) => addr.id === selectedAddressId);
        },
      },
    }),
    {
      name: 'checkout-storage',
      // Persist the selected address ID so the user's choice is remembered
      partialize: (state) => ({
        selectedAddressId: state.selectedAddressId,
      }),
    },
  ),
);
