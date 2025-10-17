import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

type Category = {
  id: string;
  name: string;
  icon?: React.ReactNode;
};

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

  // Check if arrows should be visible
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
    <div className='relative'>
      {/* Left Arrow - Hidden on mobile, visible on desktop when scrollable */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className='absolute top-1/2 left-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-50 md:flex'
          aria-label='Scroll left'
        >
          <ChevronLeft className='h-5 w-5 text-gray-700' />
        </button>
      )}

      {/* Scrollable categories */}
      <div
        ref={scrollRef}
        className='scrollbar-hide flex gap-2 overflow-x-auto scroll-smooth py-4 sm:gap-3 md:px-12'
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 transition sm:min-w-[90px] sm:px-4 sm:py-3 ${
              activeCategory === cat.id
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-[#f5f0e1] text-gray-700 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            {/* Icon */}
            {cat.icon && (
              <div className='flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12 md:h-14 md:w-14'>
                {cat.icon}
              </div>
            )}

            {/* Name */}
            <span className='text-xs font-medium sm:text-sm'>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Right Arrow - Hidden on mobile, visible on desktop when scrollable */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className='absolute top-1/2 right-0 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-50 md:flex'
          aria-label='Scroll right'
        >
          <ChevronRight className='h-5 w-5 text-gray-700' />
        </button>
      )}

      {/* Add this CSS to your global styles or component */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
