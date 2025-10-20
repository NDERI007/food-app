import React, { useState, useEffect } from 'react';
import { MapPin, Store, Clock, Phone } from 'lucide-react';
import axios from 'axios';
import type { SavedAddress } from '@utils/schemas/address';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import AddressModal from '@components/searchModal';

const DeliveryDetails: React.FC = () => {
  const {
    deliveryOption,
    place,
    sessionToken,
    setDeliveryOption,
    setDeliveryAddress,
    changeLocation,
  } = useDeliveryStore();

  const [showModal, setShowModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isDelivery = deliveryOption === 'delivery';

  // ✅ Static restaurant info (single restaurant setup)
  const restaurantInfo = {
    name: 'FCL Restaurant',
    address: '123 Main Street, Downtown',
    phone: '0727922764',
    hours: '11:00 AM – 10:00 PM',
    mapUrl: 'https://maps.google.com/?q=123+Main+Street+Downtown',
  };

  // ✅ Fetch saved addresses only when the modal opens
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      if (showModal) {
        setIsLoading(true);
        try {
          const res = await axios.get<SavedAddress[]>('/api/addr/look-up');
          setSavedAddresses(res.data);
        } catch (err) {
          console.error('Failed to fetch saved addresses:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchSavedAddresses();
  }, [showModal]);

  // 🧭 Handle address change
  const handleChangeAddress = () => {
    // Generate a new session token when changing the address
    changeLocation();
    console.log('→ New session token generated:', sessionToken);
    setShowModal(true);
  };

  return (
    <>
      <div className='rounded-xl border border-gray-100 bg-white p-4 shadow-sm'>
        {/* Header + Toggle */}
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <h3 className='text-lg'>Delivery Details</h3>

          <div className='flex gap-2'>
            <button
              onClick={() => setDeliveryOption('delivery')}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 transition ${
                isDelivery
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              Delivery
            </button>

            <button
              onClick={() => setDeliveryOption('pickup')}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                !isDelivery
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              Pickup
            </button>
          </div>
        </div>

        {/* Delivery vs Pickup */}
        {isDelivery ? (
          <div className='flex items-start gap-3'>
            <MapPin className='mt-1 h-5 w-5 text-gray-500' />
            {place ? (
              <div className='flex flex-col'>
                <p className='font-medium text-gray-900'>{place.main_text}</p>
                {place.secondary_text && (
                  <p className='text-sm text-gray-600'>
                    {place.secondary_text}
                  </p>
                )}
              </div>
            ) : (
              <p className='text-sm text-gray-500'>No address selected yet</p>
            )}

            <button
              onClick={handleChangeAddress}
              className='ml-auto flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1.5 text-sm text-gray-600 hover:bg-green-200'
            >
              Edit
            </button>
          </div>
        ) : (
          <div className='flex items-start gap-3'>
            <Store className='mt-1 h-5 w-5 text-gray-500' />
            <div className='flex flex-col'>
              <p className='font-medium text-gray-900'>{restaurantInfo.name}</p>
              <p className='text-sm text-gray-600'>{restaurantInfo.address}</p>
              <p className='text-xs text-gray-500'>
                <Clock className='mr-1 inline h-3 w-3' />
                {restaurantInfo.hours}
              </p>
              <p className='text-xs text-gray-500'>
                <Phone className='mr-1 inline h-3 w-3' />
                {restaurantInfo.phone}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 🪟 Address Modal */}
      <AddressModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(selectedAddress) => {
          // ✅ Save address + pass current token
          setDeliveryAddress(selectedAddress, sessionToken);
          setShowModal(false);
        }}
        savedAddresses={savedAddresses}
        isLoading={isLoading}
      />
    </>
  );
};

export default DeliveryDetails;
