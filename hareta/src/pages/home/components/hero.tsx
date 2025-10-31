import { useRef, useState, useEffect } from 'react';
import { usePlacesSearch, type Place } from '@utils/hooks/placeSearch';
import { useNavigate } from 'react-router-dom';
import FallbackModal from '@components/modal';
import { MapPin } from 'lucide-react';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import { v4 as uuidv4 } from 'uuid';

// --- COLOR HELPERS ---
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');

const lerpColor = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    Math.round(lerp(r1, r2, t)),
    Math.round(lerp(g1, g2, t)),
    Math.round(lerp(b1, b2, t)),
  );
};

interface HeroSearchBarProps {
  onSubmit?: (place: Place) => void;
}

export default function HeroStickyHeadline({ onSubmit }: HeroSearchBarProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const { setDeliveryAddress } = useDeliveryStore();

  const navigate = useNavigate();
  // Use the Places hook
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

      // Call parent's onSubmit if provided
      onSubmit?.(place);

      // Navigate to dashboard
      navigate('/dashboard');
    },
  });

  // Scroll progress for animations
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollProgress = -rect.top / (rect.height - vh);
      setProgress(clamp(scrollProgress));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // --- ANIMATION VALUES ---
  const imgDarkness = lerp(0, 0.4, progress);
  const textTranslateY = lerp(-15, 0, progress);
  const imgContainerTranslateY = lerp(40, 0, progress);
  const imgContainerWidth = lerp(75, 100, progress);
  const imgContainerHeight = lerp(60, 100, progress);
  const imgContainerRadius = lerp(32, 0, progress);
  const innerImgScale = lerp(1.2, 1, progress);

  // --- COLOR TRANSITION ---
  const baseColor = '#195908';
  const midColor = '#3f704d';
  const endColor = '#faf7ef';
  let headlineColor = baseColor;

  if (progress >= 0.2 && progress < 0.3) {
    const t = (progress - 0.2) / 0.1;
    headlineColor = lerpColor(baseColor, midColor, t);
  } else if (progress >= 0.3 && progress < 0.4) {
    const t = (progress - 0.3) / 0.1;
    headlineColor = lerpColor(midColor, endColor, t);
  } else if (progress >= 0.4) {
    headlineColor = endColor;
  }

  return (
    <section ref={heroRef} className='relative h-[300vh]'>
      <div className='sticky top-0 flex h-screen items-center justify-center overflow-hidden'>
        {/* Headline */}
        <div
          style={{ transform: `translateY(${textTranslateY}vh)` }}
          className='relative z-10 mx-auto text-center'
        >
          <h1
            className='mb-4 text-4xl leading-tight md:text-6xl lg:text-7xl'
            style={{ color: headlineColor }}
          >
            The Easy meals for busy days
          </h1>

          {/* Search bar */}
          <div className='flex flex-col items-stretch gap-2 overflow-visible rounded-xl bg-white shadow-md md:flex-row md:gap-0'>
            <div className='relative flex-1'>
              <MapPin
                size={20}
                className='absolute top-1/2 left-3 -translate-y-1/2 text-gray-400'
              />
              <input
                type='text'
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder='Enter delivery address'
                className='w-full px-10 py-3 focus:outline-none'
                aria-label='Enter delivery address'
              />

              {/* Suggestions dropdown */}
              {isOpen && (
                <ul className='absolute top-full right-0 left-0 z-20 max-h-60 overflow-auto rounded-lg bg-white shadow-md'>
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
                        <div className='font-medium'>
                          {r.main_text ?? r.name}
                        </div>
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
                      Can’t find tha place? Click to specify
                    </li>
                  )}
                </ul>
              )}

              {loading && (
                <div className='absolute top-3 right-3 text-xs text-gray-500'>
                  Loading…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image container */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translateY(${imgContainerTranslateY}vh)`,
            width: `${imgContainerWidth}%`,
            height: `${imgContainerHeight}vh`,
            borderRadius: `${imgContainerRadius}px`,
            overflow: 'hidden',
            willChange: 'transform, width, height, border-radius',
          }}
        >
          <img
            src='/images/hero-1200.avif'
            alt='Choma'
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${innerImgScale})`,
              willChange: 'transform',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(0,0,0,${imgDarkness})`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
      {/* Fallback modal */}
      <FallbackModal
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        onSubmit={(data) => {
          const customPlace = {
            id: uuidv4(),
            place_id: null,
            secondary_text: 'Nduini, Kenya',
            main_text: data.name,
            source: 'manual',
            description: data.landmark, // Just name if no room
          };

          // Save to store with properly formatted address
          setDeliveryAddress(customPlace);
          onSubmit?.(customPlace);
          navigate('/dashboard');
        }}
      />
    </section>
  );
}
