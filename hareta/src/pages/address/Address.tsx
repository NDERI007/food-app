import { useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import AddressForm, { type SavedAddress } from './components/form';
import axios from 'axios';
import { toast } from 'sonner';
import type { Place } from '@utils/hooks/placeSearch';
import { api } from '@utils/hooks/apiUtils';

export default function AddressPage() {
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch addresses from database on mount
  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/api/addr/look-up', {
        withCredentials: true,
      }); // GET request via axios

      // Expecting { addresses: SavedAddress[] } from backend
      setSavedAddresses(data.addresses || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);

      let message = 'Failed to load addresses. Please try again.';

      if (axios.isAxiosError(error)) {
        message =
          error.response?.data?.message ||
          (error.code === 'ECONNABORTED'
            ? 'Request timed out. Please try again.'
            : message);
      }

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (address: Place, label: string) => {
    try {
      if (!address.lat || !address.lng) {
        const { data } = await api.post(
          '/api/places/place-details',
          {
            placeId: address.place_id,
            main_text: address.main_text,
            secondary_text: address.secondary_text,
            label,
          },
          {
            withCredentials: true,
          },
        );

        if (!data.success || !data.address) {
          throw new Error('Failed to fetch place details');
        }
      }
      const payload = {
        label: label, // comes from your input
        place_name: address.main_text, // from Google Autocomplete
        address: address.secondary_text, // formatted secondary line
        place_id: address.place_id, // Google Place ID
        lat: address.lat, // from Google result
        lng: address.lng, // from Google result
      };

      const { data } = await api.post('/api/addr/upsert', payload, {
        withCredentials: true,
      });

      // Backend expected to return { address: {...} }
      setSavedAddresses((prev) => [...prev, data.address]);
      toast.success('Address saved successfully!');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          (error.code === 'ECONNABORTED'
            ? 'Request timed out. Please try again.'
            : 'Something went wrong while saving your address.');

        console.error('Add address error:', error);
        toast.error(message);
      } else {
        console.error('Unexpected error:', error);
        toast.error('An unexpected error occurred.');
      }
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { status } = await api.delete(`/api/addr/${id}`);

      if (status !== 200 && status !== 204) {
        throw new Error('Failed to delete address');
      }

      // Optimistically update local state
      setSavedAddresses((prev) => prev.filter((addr) => addr.id !== id));

      toast.success('Address deleted successfully'); // optional
    } catch (error) {
      console.error('Error deleting address:', error);

      let message = 'Failed to delete address. Please try again.';

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }

      toast.error(message);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8'>
      <div className='mx-auto max-w-4xl'>
        {/* Header */}
        <div className='mb-6 rounded-2xl bg-white p-8 shadow-lg'>
          <div className='mb-2 flex items-center gap-3'>
            <div className='rounded-full bg-green-100 p-3'>
              <MapPin className='text-green-600' size={28} />
            </div>
            <div>
              <h1 className='text-3xl text-gray-800'>Saved places</h1>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-6 rounded-lg border border-red-200 bg-red-50 p-4'>
            <p className='text-red-800'>{error}</p>
            <button
              onClick={fetchAddresses}
              className='mt-2 text-sm text-red-600 underline hover:text-red-800'
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='animate-spin text-green-600' size={48} />
          </div>
        ) : (
          <AddressForm
            savedAddresses={savedAddresses}
            onAdd={handleAddAddress}
            onDelete={handleDeleteAddress}
          />
        )}
      </div>
    </div>
  );
}
