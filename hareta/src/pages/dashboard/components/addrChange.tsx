import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Home,
  X,
  Search,
  Clock,
  Phone,
  ChevronDown,
} from 'lucide-react';
import { usePlacesSearch, type Place } from '@utils/hooks/placeSearch';
import { toast } from 'sonner';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';

// Type definitions
type DeliveryOption = 'delivery' | 'pickup';

interface SavedAddress {
  id: number;
  label: string;
  address: string;
}

interface RestaurantInfo {
  name: string;
  address: string;
  city: string;
  phone: string;
  hours: string;
  mapUrl: string;
}

interface RestaurantInfo {
  name: string;
  address: string;
  city: string;
  phone: string;
  hours: string;
  mapUrl: string;
}

export const DeliveryPickupToggle: React.FC = () => {
  // Get delivery info from global store
  const {
    address,
    place: currentPlace,
    sessionToken,
    deliveryOption: selectedOption,
    setDeliveryAddress,
    changeLocation,
    setDeliveryOption,
  } = useDeliveryStore();

  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock restaurant location data - replace with your actual data
  const restaurantInfo: RestaurantInfo = {
    name: 'Restaurant Name',
    address: '123 Main Street, Downtown',
    city: 'New York, NY 10001',
    phone: '0727922764',
    hours: '11:00 AM - 10:00 PM',
    mapUrl: 'https://maps.google.com/?q=123+Main+Street+New+York',
  };

  // Mock saved addresses - replace with actual user data
  const savedAddresses: SavedAddress[] = [
    { id: 1, label: 'Home', address: '456 Oak Avenue, Apt 3B' },
    { id: 2, label: 'Work', address: '789 Business Plaza, Floor 5' },
  ];

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
    if (option === 'delivery' && !address) {
      setShowModal(true);
      setShowDropdown(false);
    } else {
      setShowDropdown(false);
    }
  };

  const {
    query,
    results,
    loading,
    isOpen,
    onChange,
    onFocus,
    onBlur,
    handleKeyDown,
    selectPlace,
  } = usePlacesSearch({
    onSubmit: (place) => {
      // When user selects an address, save to global store
      const newAddress = place.description || place.main_text || '';
      setDeliveryAddress(newAddress, place, sessionToken);
      setShowModal(false);
    },
    sessionToken, // Use session token from store
  });

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

  const handleAddressSelect = (selectedAddress: string): void => {
    console.log('Selected address:', selectedAddress);
    setShowModal(false);

    // Save to global store
    if (currentPlace) {
      setDeliveryAddress(selectedAddress, currentPlace, sessionToken);
    }
  };

  const handleSavedAddressSelect = (savedAddress: SavedAddress): void => {
    setShowModal(false);
    console.log('Selected saved address:', savedAddress);

    // Create a place object from saved address and save to store
    const place: Place = {
      place_id: null,
      name: savedAddress.label,
      description: savedAddress.address,
      source: 'saved',
      id: 0,
      lat: null,
      lng: null,
    };

    setDeliveryAddress(savedAddress.address, place, sessionToken);
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
                  {address || 'Select address'}
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
                  {address ? (
                    <div>
                      <p className='mb-1 text-xs text-gray-500'>
                        Current delivery address:
                      </p>
                      <p className='mb-3 text-sm text-gray-800'>{address}</p>
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
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white'>
            <div className='p-6'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-semibold'>Delivery Address</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className='text-gray-500 hover:text-gray-700'
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search Input */}
              <div className='mb-4'>
                <div className='relative'>
                  <input
                    type='text'
                    value={query}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onKeyDown={handleKeyDown}
                    placeholder='Enter delivery address...'
                    className='w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:ring-2 focus:ring-green-500 focus:outline-none'
                  />
                  <button className='absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500 hover:text-green-600'>
                    <Search size={20} />
                  </button>
                </div>
                {/* Loading indicator */}
                {loading && (
                  <p className='mt-2 text-sm text-gray-400'>Searching...</p>
                )}
              </div>

              {/* Search Results */}
              {isOpen && results.length > 0 && (
                <div className='mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-100 bg-white shadow'>
                  {results.map((place, index) => (
                    <button
                      key={index}
                      onMouseDown={() => selectPlace(place)} // onMouseDown prevents premature blur
                      className='flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50'
                    >
                      <MapPin size={16} className='text-gray-500' />
                      <div>
                        <p className='font-medium text-gray-800'>
                          {place.main_text || place.description}
                        </p>
                        {place.secondary_text && (
                          <p className='text-sm text-gray-500'>
                            {place.secondary_text}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && !isOpen && (
                <div>
                  <p className='mb-2 text-sm text-gray-600'>Saved Addresses:</p>
                  <div className='space-y-2'>
                    {savedAddresses.map((saved: SavedAddress) => (
                      <button
                        key={saved.id}
                        onClick={() => handleSavedAddressSelect(saved)}
                        className='w-full rounded-lg bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100'
                      >
                        <div className='flex items-center gap-3'>
                          <div className='rounded-full bg-green-100 p-2'>
                            <Home size={16} className='text-green-600' />
                          </div>
                          <div>
                            <p className='font-medium text-gray-800'>
                              {saved.label}
                            </p>
                            <p className='text-sm text-gray-600'>
                              {saved.address}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              {address && (
                <button
                  onClick={() => handleAddressSelect(address)}
                  className='mt-4 w-full rounded-lg bg-green-600 py-3 text-white transition-colors hover:bg-green-700'
                >
                  Confirm Delivery Address
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
