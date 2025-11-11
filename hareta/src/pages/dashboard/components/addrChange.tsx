import React, { useState } from 'react';
import { MapPin, ChevronDown, Home, Clock, Phone } from 'lucide-react';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import AddressModal from '@components/searchModal';
import { toast } from 'sonner';
import axios from 'axios';
import type { SavedAddress } from '@utils/schemas/address';

const DeliveryPickupToggle: React.FC = () => {
  const {
    place: currentPlace,
    deliveryOption,
    setDeliveryOption,
    setDeliveryAddress,
    changeLocation,
  } = useDeliveryStore();

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPickupInfo, setShowPickupInfo] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Mock restaurant info — replace with your data
  const restaurantInfo = {
    name: 'Junction Trade Centre',
    address: '123 Main Street, Downtown',
    phone: '0745340424',
    hours: '9:00 AM - 9:30 PM',
    mapUrl: 'https://maps.google.com/?q=Junction+Trade+Centre',
  };

  const fetchSavedAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const { data } = await axios.get('/api/addr/look-up');
      setSavedAddresses(data.addresses || []);
    } catch (error) {
      console.error('Failed to fetch saved addresses:', error);
      toast.error('Could not load saved addresses.');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleOpenModal = () => {
    if (deliveryOption === 'delivery') {
      changeLocation();
      fetchSavedAddresses();
      setShowAddressModal(true);
    } else {
      setShowPickupInfo(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(restaurantInfo.phone);
      toast.success('Phone number copied!');
    } catch {
      toast.error('Failed to copy phone number.');
    }
  };

  return (
    <>
      {/* header section */}
      <div className='flex flex-wrap items-center justify-center gap-3 py-2 sm:gap-4'>
        {/* Delivery / Pickup Toggle */}
        <div className='flex rounded-full border border-gray-300 bg-gray-100 p-0.5'>
          <button
            onClick={() => setDeliveryOption('delivery')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition sm:px-5 ${
              deliveryOption === 'delivery'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Home size={14} />
            <span className='hidden sm:inline'>Delivery</span>
          </button>
          <button
            onClick={() => setDeliveryOption('pickup')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition sm:px-5 ${
              deliveryOption === 'pickup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin size={14} />
            <span className='hidden sm:inline'>Pickup</span>
          </button>
        </div>

        {/* Inline location + "Now" */}
        <button
          onClick={handleOpenModal}
          className='flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900'
        >
          <MapPin size={16} className='text-gray-500' />
          <span className='max-w-[140px] truncate font-medium sm:max-w-[200px]'>
            {deliveryOption === 'delivery'
              ? currentPlace?.main_text || 'Select address'
              : restaurantInfo.name}
          </span>
          <ChevronDown size={16} className='text-gray-400' />
        </button>
      </div>

      {/* Delivery Address Modal */}
      <AddressModal
        show={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={(place) => {
          setDeliveryAddress(place);
        }}
        savedAddresses={savedAddresses}
        isLoading={isLoadingAddresses}
      />

      {/* Pickup Info Modal */}
      {showPickupInfo && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl'>
            <h2 className='mb-2 text-lg font-semibold text-gray-900'>
              {restaurantInfo.name}
            </h2>
            <p className='mb-2 text-sm text-gray-600'>
              {restaurantInfo.address}
            </p>
            <div className='mb-2 flex items-center gap-2 text-sm text-gray-700'>
              <Clock size={14} className='text-green-600' />
              <span>{restaurantInfo.hours}</span>
            </div>
            <div className='mb-4 flex items-center gap-2 text-sm text-gray-700'>
              <Phone size={14} className='text-green-600' />
              <button
                onClick={handleCopy}
                className='font-medium hover:underline'
              >
                {restaurantInfo.phone}
              </button>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => window.open(restaurantInfo.mapUrl, '_blank')}
                className='flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700'
              >
                Get Directions
              </button>
              <button
                onClick={() => setShowPickupInfo(false)}
                className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeliveryPickupToggle;
