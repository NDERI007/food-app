import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Home } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { usePlacesSearch } from '@utils/hooks/placeSearch';
import type { SavedAddress } from './addrChange';

interface DeliveryAddressModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (address: any) => void;
  savedAddresses: SavedAddress[];
  address: any;
  handleSavedAddressSelect: (saved: SavedAddress) => void;
  handleAddressSelect: (address: any) => void;
}

export default function AddressModal({
  show,
  onClose,
  onSelect,
  savedAddresses,
  address,
  handleSavedAddressSelect,
  handleAddressSelect,
}: DeliveryAddressModalProps) {
  const sessionToken = useMemo(() => uuidv4(), [show]);

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
    debounceMs: 250,
    minChars: 2,
    sessionToken,
    onSubmit: (place) => {
      onSelect(place);
      onClose();
    },
  });

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            key='backdrop'
            className='fixed inset-0 z-40 bg-black/50'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key='modal'
            className='fixed inset-0 z-50 flex items-center justify-center p-4'
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div
              className='max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-lg'
              onClick={(e) => e.stopPropagation()} // prevent backdrop close
            >
              <div className='p-6'>
                {/* Header */}
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-semibold'>Delivery Address</h2>
                  <button
                    onClick={onClose}
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
                    <button
                      type='button'
                      className='absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500 hover:text-green-600'
                    >
                      <Search size={20} />
                    </button>
                  </div>

                  {loading && (
                    <p className='mt-2 text-sm text-gray-400'>Searching...</p>
                  )}
                </div>

                {/* Search Results */}
                <AnimatePresence mode='popLayout'>
                  {isOpen && results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className='mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-100 bg-white shadow'
                    >
                      {results.map((place, index) => (
                        <button
                          key={index}
                          onMouseDown={() => selectPlace(place)}
                          className='flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50'
                        >
                          <MapPin size={16} className='text-gray-500' />
                          <div>
                            <p className='font-medium text-gray-800'>
                              {place.main_text}
                            </p>
                            {place.secondary_text && (
                              <p className='text-sm text-gray-500'>
                                {place.secondary_text}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Saved Addresses */}
                {savedAddresses.length > 0 && !isOpen && (
                  <div>
                    <p className='mb-2 text-sm text-gray-600'>
                      Saved Addresses:
                    </p>
                    <div className='space-y-2'>
                      {savedAddresses.map((saved) => (
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
