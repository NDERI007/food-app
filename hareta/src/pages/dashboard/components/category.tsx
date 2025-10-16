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
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className='relative flex items-center'>
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className='absolute left-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-r from-gray-100/90 to-transparent'
        >
          <ChevronLeft className='h-5 w-5' />
        </button>
      )}

      {/* Scrollable categories */}
      <div
        ref={scrollRef}
        className='scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth px-10 py-4'
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex min-w-[80px] flex-col items-center gap-1 rounded-lg px-4 py-2 ${
              activeCategory === cat.id
                ? 'bg-green-600 text-white'
                : 'bg-[rgb(245,240,225)] text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className='h-14 w-14'>{cat.icon}</div>
            <span className='text-[ #274e13] text-sm font-medium'>
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className='absolute right-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-l from-gray-100/90 to-transparent'
        >
          <ChevronRight className='h-5 w-5' />
        </button>
      )}
    </div>
  );
}
