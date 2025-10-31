import { useState } from 'react';
import { MapPin, Trash2, Plus, Search } from 'lucide-react';
import { usePlacesSearch, type Place } from '@utils/hooks/placeSearch';

export interface SavedAddress {
  id: string;
  label: string;
  place_name: string;
  address: string;
}
interface SavedAddressFormProps {
  savedAddresses: SavedAddress[];
  onAdd: (address: Place, label: string) => void;
  onDelete: (id: string) => void;
}

export default function AddressForm({
  savedAddresses,
  onAdd,
  onDelete,
}: SavedAddressFormProps) {
  const [label, setLabel] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<Place | null>(null);

  const {
    query,
    results,
    isOpen,
    onChange,
    onFocus,
    onBlur,
    handleKeyDown,
    selectPlace,
  } = usePlacesSearch({
    debounceMs: 250,
    minChars: 2,
    onSubmit: (place) => {
      const addressObj: Place = {
        place_id: place.place_id,
        main_text: place.main_text,
        secondary_text: place.secondary_text,
        lat: place.lat,
        lng: place.lng,
      };

      setSelectedAddress(addressObj);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !selectedAddress) return;

    const newAddress = { ...selectedAddress };
    onAdd(newAddress, label);

    // Reset form
    setLabel('');
    setSelectedAddress(null);
    onChange(''); // clear query
  };

  return (
    <div className='space-y-4'>
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
      >
        <h3 className='mb-3 text-lg text-gray-800'>Add a place</h3>

        <div className='space-y-3'>
          {/* Label input */}
          <input
            type='text'
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='Label (e.g. Home, Office)'
            className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
          />

          {/* Address input with autocomplete */}
          <div className='relative'>
            <input
              type='text'
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              placeholder='Search address...'
              className='w-full rounded-lg border border-gray-300 px-4 py-2 pr-10 focus:ring-2 focus:ring-green-500 focus:outline-none'
            />
            <Search
              size={18}
              className='absolute top-1/2 right-3 -translate-y-1/2 text-gray-500'
            />

            {/* Autocomplete results */}
            {isOpen && results.length > 0 && (
              <div className='absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-100 bg-white shadow'>
                {results.map((place, index) => (
                  <button
                    key={index}
                    type='button'
                    onMouseDown={() => selectPlace(place)}
                    className='flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50'
                  >
                    <MapPin size={16} className='text-gray-500' />
                    <div>
                      <p className='font-medium text-gray-800'>
                        {place.main_text || place.name}
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
          </div>

          {/* Add button */}
          <button
            type='submit'
            disabled={!label || !selectedAddress}
            className='flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <Plus size={18} />
            Save Address
          </button>
        </div>
      </form>

      {/* Saved addresses list */}
      <div className='space-y-2'>
        {savedAddresses.length === 0 && (
          <p className='text-center text-sm text-gray-500'>
            No saved addresses yet.
          </p>
        )}

        {savedAddresses.map((saved) => (
          <div
            key={saved.id}
            className='flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3'
          >
            <div className='flex items-center gap-3'>
              <div className='rounded-full bg-green-100 p-2'>
                <MapPin size={16} className='text-green-600' />
              </div>
              <div>
                <p className='font-medium text-gray-800'>{saved.label}</p>
                <p className='text-sm text-gray-600'>{saved.place_name}</p>
              </div>
            </div>
            <button
              onClick={() => onDelete(saved.id!)}
              className='text-gray-400 transition-colors hover:text-red-500'
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
