import { useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import AddressForm from './components/form';
import axios from 'axios';
import { toast } from 'sonner';

export interface SavedAddress {
  id: number;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

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
      const { data } = await axios.get('/api/addresses'); // GET request via axios

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
      toast.error(message); // optional, can remove if you prefer silent handling
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (address: SavedAddress) => {
    try {
      const { data } = await axios.post('/api/', address);

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

  const handleDeleteAddress = async (id: number) => {
    try {
      const { status } = await axios.delete(`/api/addresses/${id}`);

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
