import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Home, Clock, Phone, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import axios from 'axios';
import type { SavedAddress } from '@utils/schemas/address';
import AddressModal from '@components/searchModal';

// Type definitions
type DeliveryOption = 'delivery' | 'pickup';

interface RestaurantInfo {
  name: string;
  address: string;
  phone: string;
  hours: string;
  mapUrl: string;
}
export const DeliveryPickupToggle: React.FC = () => {
  // Get delivery info from global store
  const {
    place: currentPlace,
    sessionToken,
    deliveryOption: selectedOption,
    setDeliveryAddress,
    changeLocation,
    setDeliveryOption,
  } = useDeliveryStore();

  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock restaurant location data - replace with your actual data
  const restaurantInfo: RestaurantInfo = {
    name: 'Restaurant Name',
    address: '123 Main Street, Downtown',
    phone: '0727922764',
    hours: '11:00 AM - 10:00 PM',
    mapUrl: 'https://maps.google.com/?q=123+Main+Street+New+York',
  };

  useEffect(() => {
    const fetchSavedAddresses = async () => {
      // Only fetch when the modal is being opened
      if (showModal) {
        setIsLoadingAddresses(true);
        try {
          const { data } = await axios.get('/api/addr/look-up');
          setSavedAddresses(data.addresses || []);
        } catch (error) {
          console.error('Failed to fetch saved addresses:', error);
          toast.error('Could not load your saved addresses.');
        } finally {
          setIsLoadingAddresses(false);
        }
      }
    };

    fetchSavedAddresses();
  }, [showModal]); // Dependency array ensures this runs when `showModal` changes
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionChange = (option: DeliveryOption): void => {
    setDeliveryOption(option);
    if (option === 'delivery' && !currentPlace) {
      setShowModal(true);
      setShowDropdown(false);
    } else {
      setShowDropdown(false);
    }
  };

  const timerRef = useRef<number | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(restaurantInfo.phone);
      toast.success('Phone number copied!');
    } catch (err) {
      toast.error('Failed to copy phone number');
      console.error(err);
    }
  };

  const handlePointerDown = () => {
    // start timer for long press
    timerRef.current = window.setTimeout(handleCopy, 600);
  };

  const handlePointerUp = () => {
    // cancel timer if released before time
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const openAddressModal = (): void => {
    // Generate NEW session token when user wants to change location
    changeLocation();
    console.log('Change location - new session token generated');

    setShowModal(true);
    setShowDropdown(false);
  };

  return (
    <>
      {/* Navbar Component */}
      <div className='relative' ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 transition-colors hover:bg-gray-50'
        >
          {selectedOption === 'delivery' ? (
            <>
              <Home size={16} className='text-green-600' />
              <div className='text-left'>
                <div className='text-xs text-gray-500'>Deliver to</div>
                <div className='max-w-[120px] truncate text-sm font-medium text-gray-800'>
                  {currentPlace?.main_text || 'Select address'}
                </div>
              </div>
            </>
          ) : (
            <>
              <MapPin size={16} className='text-green-600' />
              <div className='text-left'>
                <div className='text-xs text-gray-500'>Pickup from</div>
                <div className='max-w-[120px] truncate text-sm font-medium text-gray-800'>
                  {restaurantInfo.name}
                </div>
              </div>
            </>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className='absolute top-full left-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg'>
            {/* Toggle Options */}
            <div className='border-b border-gray-200 p-3'>
              <div className='relative flex rounded-lg bg-gray-100 p-1'>
                <div
                  className={`absolute top-1 h-8 w-1/2 rounded-md bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                    selectedOption === 'pickup' ? 'translate-x-full' : ''
                  }`}
                />
                <button
                  onClick={() => handleOptionChange('delivery')}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition-colors ${
                    selectedOption === 'delivery'
                      ? 'font-medium text-green-600'
                      : 'text-gray-600'
                  }`}
                >
                  <Home size={14} />
                  <span>Delivery</span>
                </button>
                <button
                  onClick={() => handleOptionChange('pickup')}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition-colors ${
                    selectedOption === 'pickup'
                      ? 'font-medium text-green-600'
                      : 'text-gray-600'
                  }`}
                >
                  <MapPin size={14} />
                  <span>Pickup</span>
                </button>
              </div>
            </div>

            {/* Content based on selection */}
            <div className='p-3'>
              {selectedOption === 'delivery' ? (
                <div>
                  {currentPlace ? (
                    <div>
                      <p className='mb-1 text-xs text-gray-500'>
                        Current delivery address:
                      </p>
                      <p className='mb-3 text-sm text-gray-800'>
                        {currentPlace.main_text}
                      </p>
                      <button
                        onClick={openAddressModal}
                        className='w-full rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700'
                      >
                        Change Address
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={openAddressModal}
                      className='w-full rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700'
                    >
                      Add Delivery Address
                    </button>
                  )}
                </div>
              ) : (
                <div className='space-y-2'>
                  <div className='flex items-start gap-2'>
                    <MapPin className='mt-0.5 text-blue-600' size={14} />
                    <div>
                      <p className='text-sm font-medium text-gray-800'>
                        {restaurantInfo.name}
                      </p>
                      <p className='text-xs text-gray-600'>
                        {restaurantInfo.address}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Clock className='text-violet-600' size={14} />
                    <p className='text-xs text-gray-600'>
                      {restaurantInfo.hours}
                    </p>
                  </div>

                  <div className='flex items-center gap-2 text-xs text-gray-600'>
                    <Phone size={14} className='mt-0.5 text-green-700' />
                    <p>
                      Call me when you get lost —{' '}
                      <span
                        className='cursor-pointer font-medium text-gray-800 transition select-none active:scale-95'
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onClick={handleCopy}
                        onPointerLeave={handlePointerUp}
                      >
                        {restaurantInfo.phone}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      window.open(restaurantInfo.mapUrl, '_blank');
                      setShowDropdown(false);
                    }}
                    className='mt-2 w-full rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700'
                  >
                    Get Directions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delivery Address Modal */}
      <AddressModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(place) => {
          // when user selects an address from search
          setDeliveryAddress(place, sessionToken);
        }}
        savedAddresses={savedAddresses}
        isLoading={isLoadingAddresses}
      />
    </>
  );
};
