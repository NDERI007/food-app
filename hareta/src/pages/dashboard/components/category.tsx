import type { Category } from '@utils/schemas/menu';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

type CategoryFilterProps = {
  categories: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
};

export default function CategoryFilter({
  categories,
  activeCategory,
  onSelect,
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories.length]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className='relative max-w-full overflow-hidden'>
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className='absolute top-1/2 left-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-50 md:flex'
          aria-label='Scroll left'
        >
          <ChevronLeft className='h-5 w-5 text-gray-700' />
        </button>
      )}

      {/* Scrollable categories - FIXED: Added max-w-full to prevent overflow */}
      <div
        ref={scrollRef}
        className='scrollbar-hide flex max-w-full gap-2 overflow-x-auto scroll-smooth py-4 sm:gap-3 md:px-12'
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex shrink-0 flex-col items-center gap-2 rounded-xl px-3 py-3 transition sm:min-w-[90px] sm:px-4 sm:py-3 ${
              activeCategory === cat.id
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-[#f5f0e1] text-gray-800 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            {/* Icon from bucket */}
            {cat.icon_url && (
              <div className='flex items-center justify-center p-2'>
                <img
                  src={cat.icon_url}
                  alt={cat.name}
                  className='h-8 w-8 object-contain md:h-12 md:w-12'
                />
              </div>
            )}

            {/* Name */}
            <span className='text-sm font-normal sm:text-sm md:text-sm'>
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className='absolute top-1/2 right-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-50 md:flex'
          aria-label='Scroll right'
        >
          <ChevronRight className='h-5 w-5 text-gray-700' />
        </button>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
