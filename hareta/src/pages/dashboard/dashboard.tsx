import { useState } from 'react';
import Navbar from './components/dashNav';
import Sidebar from './components/sideBar';
import CartDrawer from './components/cartDrawer';
import CategoryFilter from './components/category';
import ProductCard from './components/productCard';
import { useCartStore } from '@utils/hooks/useCrt';
import { useMenuItems, useCategories } from '@utils/hooks/productStore';
import { Loader2 } from 'lucide-react';

function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>('all');

  // Fetch categories
  const { data: categories, isLoading: isCategoriesLoading } = useCategories();

  // Fetch products based on the selected category (server-side filtering!)
  const {
    data: products,
    isLoading: isProductsLoading,
    error: productsError,
  } = useMenuItems(activeCategory);

  // --- 2. STATE MANAGEMENT LAYER ---
  const toggleCart = useCartStore((state) => state.toggleCart);
  const totalItems = useCartStore((state) => state.totalItems());

  // Combine loading states for a simpler check in the UI
  const isLoading = isCategoriesLoading || isProductsLoading;

  // --- 3. PRESENTATION LAYER ---
  return (
    <div className='flex min-h-screen flex-col bg-gray-50'>
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        onToggleCart={toggleCart}
        cartItemCount={totalItems}
      />
      <Sidebar open={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <CartDrawer />

      <main className='flex-1 p-4 sm:p-6'>
        <CategoryFilter
          categories={categories || []}
          activeCategory={activeCategory || 'all'}
          onSelect={setActiveCategory}
        />

        {/* --- REFACTORED PRODUCT DISPLAY LOGIC --- */}
        <div className='mt-6'>
          {isLoading ? (
            // A. LOADING STATE
            <div className='flex h-64 items-center justify-center'>
              <Loader2 className='h-8 w-8 animate-spin text-green-600' />
            </div>
          ) : productsError ? (
            // B. ERROR STATE
            <div className='flex h-64 items-center justify-center rounded-lg bg-red-50 p-4 text-center text-red-600'>
              <p>Could not load products. Please try again later.</p>
            </div>
          ) : !products || products.length === 0 ? (
            // C. EMPTY STATE
            <div className='flex h-64 items-center justify-center rounded-lg bg-gray-100 text-center text-gray-500'>
              <p>No products found in this category.</p>
            </div>
          ) : (
            // D. SUCCESS STATE
            <div className='grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4'>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
