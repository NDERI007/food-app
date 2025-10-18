import { useState } from 'react';
import { toast } from 'sonner';
import Navbar from './components/dashNav';
import Sidebar from './components/sideBar';
import CartDrawer from './components/cartDrawer';
import CategoryFilter from './components/category';
import ProductCard from './components/productCard';
import { useCartStore } from '@utils/hooks/useCrt';
import { useMenuItems, useCategories } from '@utils/hooks/productStore';
import { Loader2, ShoppingBag, AlertCircle } from 'lucide-react';

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

  // State management
  const toggleCart = useCartStore((state) => state.toggleCart);
  const totalItems = useCartStore((state) => state.totalItems());

  // Combine loading states
  const isLoading = isCategoriesLoading || isProductsLoading;

  // Handle category change
  const handleCategoryChange = (categoryId: string | null) => {
    setActiveCategory(categoryId);
  };

  return (
    <div className='flex min-h-screen flex-col'>
      {/* Navigation */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        onToggleCart={toggleCart}
        cartItemCount={totalItems}
      />

      {/* Sidebar */}
      <Sidebar open={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Main Content */}
      <main className='flex-1 px-4 py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          {/* Category Filter */}
          <div className='mb-6'>
            <CategoryFilter
              categories={categories || []}
              activeCategory={activeCategory || 'all'}
              onSelect={handleCategoryChange}
            />
          </div>

          {/* Products Section */}
          {isLoading ? (
            // Loading State
            <div className='flex h-64 flex-col items-center justify-center gap-3'>
              <Loader2 className='h-10 w-10 animate-spin text-green-600' />
              <p className='text-sm text-gray-600'>Loading products...</p>
            </div>
          ) : productsError ? (
            // Error State with Sonner Toast
            <div className='flex h-64 flex-col items-center justify-center gap-4 rounded-xl bg-white p-6 shadow-sm'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
                <AlertCircle className='h-8 w-8 text-red-600' />
              </div>
              <div className='text-center'>
                <h3 className='mb-1 text-lg font-semibold text-gray-900'>
                  Unable to Load Products
                </h3>
                <p className='text-sm text-gray-600'>
                  We're having trouble loading the products. Please try again.
                </p>
              </div>
              <button
                onClick={() => {
                  window.location.reload();
                  toast.error('Failed to load products. Refreshing...');
                }}
                className='rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700'
              >
                Retry
              </button>
            </div>
          ) : !products || products.length === 0 ? (
            // Empty State
            <div className='flex h-64 flex-col items-center justify-center gap-4 rounded-xl bg-white p-6 shadow-sm'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gray-100'>
                <ShoppingBag className='h-8 w-8 text-gray-400' />
              </div>
              <div className='text-center'>
                <h3 className='mb-1 text-lg font-semibold text-gray-900'>
                  No Products Found
                </h3>
                <p className='text-sm text-gray-600'>
                  {activeCategory === 'all'
                    ? "We don't have any products available at the moment."
                    : 'Try selecting a different category.'}
                </p>
              </div>
              {activeCategory !== 'all' && (
                <button
                  onClick={() => {
                    setActiveCategory('all');
                    toast.info('Showing all products');
                  }}
                  className='text-sm font-medium text-green-600 hover:text-green-700'
                >
                  View All Products
                </button>
              )}
            </div>
          ) : (
            // Success State - Responsive Grid
            <>
              {/* Responsive Product Grid */}
              <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
