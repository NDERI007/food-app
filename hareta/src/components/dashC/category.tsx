type Category = {
  id: string;
  label: string;
  icon: React.ReactNode;
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
  return (
    <div className='scrollbar-hide flex gap-4 overflow-x-auto py-4'>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex min-w-[80px] flex-col items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
            activeCategory === cat.id
              ? 'border-green-600 bg-green-600 text-white'
              : 'border-gray-300 bg-white hover:bg-gray-100'
          }`}
        >
          <div className='flex h-10 w-10 items-center justify-center'>
            {cat.icon}
          </div>
          <span className='text-sm font-medium whitespace-nowrap'>
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  );
}
