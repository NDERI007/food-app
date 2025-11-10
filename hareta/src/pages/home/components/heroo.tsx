import { useState } from 'react';
import { usePlacesSearch } from '@utils/hooks/placeSearch';
import { useNavigate } from 'react-router-dom';
import FallbackModal from '@components/modal';
import { MapPin } from 'lucide-react';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import { v4 as uuidv4 } from 'uuid';

export function HeroSection() {
  // --- LOGIC FROM HeroStickyHeadline ---
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const { setDeliveryAddress } = useDeliveryStore();
  const navigate = useNavigate();

  const {
    query,
    results,
    loading,
    isOpen,
    highlightedIndex,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    handleKeyDown,
    selectPlace,
  } = usePlacesSearch({
    onSubmit: (place) => {
      // Save address to store
      setDeliveryAddress(place);

      // Navigate to dashboard
      navigate('/dashboard');
    },
  });
  // --- END LOGIC ---

  return (
    <>
      <section className='/* MOBILE-FIRST (default): 1 column, less padding */ /* Reduced padding for mobile */ /* DESKTOP (lg:): 5 columns, more padding, min-height */ mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 bg-[#fefaef] px-4 py-12 lg:min-h-[80vh] lg:grid-cols-5 lg:gap-8 lg:px-8 lg:py-16'>
        {/* COLUMN 1: The Giant Headline */}
        <div className='/* MOBILE: 1 column, centered text */ /* DESKTOP: 3 columns, left-aligned */ col-span-1 text-center leading-none font-black text-green-900 uppercase lg:col-span-3 lg:text-left'>
          {/* We stack the headline and size each line responsively */}
          <span className='block text-5xl lg:text-[6rem]'>The Easy</span>
          <span className='block text-6xl lg:text-[8rem]'>Meals for</span>
          <span className='block text-5xl lg:text-[6rem]'>Busy Days</span>
        </div>

        {/* COLUMN 2: The Content */}
        <div className='/* MOBILE: 1 column */ /* DESKTOP: 2 columns */ col-span-1 flex flex-col gap-6 lg:col-span-2'>
          {/* Info Block */}
          <div className='flex flex-col gap-1 text-green-900'>
            <p className='text-lg font-semibold'>
              Open Daily: 9:00 AM - 10:00 PM
            </p>
            <p className='text-md text-green-900/80'>
              Delivery within a 5km radius from School Campus.
            </p>
          </div>

          {/* --- REAL SEARCH BAR --- */}
          {/* We wrap it in a relative container to position the dropdown */}
          <div className='relative w-full'>
            {/* This is the visible search bar, styled with our new pill shape */}
            <div className='flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-md'>
              <MapPin size={20} className='text-gray-400' />
              <input
                type='text'
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder='Enter delivery address'
                className='w-full border-none bg-transparent text-base placeholder-gray-500 focus:ring-0 focus:outline-none'
                aria-label='Enter delivery address'
              />
              {loading && <div className='text-xs text-gray-500'>Loading…</div>}
            </div>

            {/* Suggestions dropdown */}
            {isOpen && (
              <ul className='absolute top-full z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-white shadow-md'>
                {results.length > 0 ? (
                  results.map((r, i) => (
                    <li
                      key={r.place_id ?? i}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        selectPlace(r);
                      }}
                      className={`cursor-pointer px-4 py-2 text-left ${
                        highlightedIndex === i ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className='font-medium'>{r.main_text ?? r.name}</div>
                      {r.secondary_text && (
                        <div className='text-xs text-gray-500'>
                          {r.secondary_text}
                        </div>
                      )}
                    </li>
                  ))
                ) : (
                  <li
                    className='cursor-pointer px-4 py-2 text-gray-500 hover:bg-gray-100'
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFallbackOpen(true);
                    }}
                  >
                    Can’t find that place? Click to specify
                  </li>
                )}
              </ul>
            )}
          </div>
          {/* --- END REAL SEARCH BAR --- */}
        </div>
      </section>

      {/* --- FALLBACK MODAL --- */}
      <FallbackModal
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        onSubmit={(data) => {
          const customPlace = {
            id: uuidv4(),
            place_id: null,
            secondary_text: data.landmark,
            main_text: data.name,
            source: 'manual',
          };

          // Save to store with properly formatted address
          setDeliveryAddress(customPlace);

          navigate('/dashboard');
        }}
      />
    </>
  );
}
