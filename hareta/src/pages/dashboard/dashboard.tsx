import { useState } from 'react';
import Navbar from '../../components/dashC/dashNav';
import Sidebar from '../../components/dashC/sideBar';
import CartDrawer from '../../components/dashC/cartDrawer';
import CategoryFilter from '../../components/dashC/category';
import ProductCard, { type Product } from '../../components/dashC/productCard';
import FriesIcon from '../../assets/french_fries.svg?react';
import BrekoIcon from '../../assets/breakfast.svg?react';
import TradIcon from '../../assets/trad.svg?react';
const categories = [
  { id: 'all', label: 'All', icon: <span>🍽️</span> },
  {
    id: 'fries',
    label: 'Fries',
    icon: <FriesIcon className='h-full w-full' />,
  },
  {
    id: 'breakfast',
    label: 'breakfast',
    icon: <BrekoIcon className='h-full w-full' />,
  },
  {
    id: 'trad',
    label: 'Traditional dishes',
    icon: <TradIcon className='h-full w-full' />,
  },
];

const products: Product[] = [
  {
    id: '1',
    name: 'Aloha Chicken',
    description: 'Reis, Zoodles, Garnelen, Sesame Dressing, Avocado',
    price: 29,
    image: 'https://source.unsplash.com/400x300/?chicken',
    discount: 15,
    category: 'burger',
  },
  {
    id: '2',
    name: 'Italian Cuisine',
    description: 'Pasta with fresh tomatoes and basil',
    price: 20,
    image: 'https://source.unsplash.com/400x300/?pasta',
    discount: 12,
    category: 'pizza',
  },
  {
    id: '3',
    name: 'Sushi Deluxe',
    description: 'Fresh sushi platter with salmon and tuna',
    price: 35,
    image: 'https://source.unsplash.com/400x300/?sushi',
    discount: 18,
    category: 'sushi',
  },
];

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSignedIn, setSignedIn] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<typeof products>([]);

  const filteredProducts =
    activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);

  const handleAddToCart = (product: (typeof products)[0]) => {
    setCart((prev) => [...prev, product]);
    setCartOpen(true);
  };

  return (
    <div className='flex min-h-screen flex-col'>
      {/* Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        onToggleCart={() => setCartOpen(!isCartOpen)}
        isSignedIn={isSignedIn}
      />

      {/* Sidebar */}
      <Sidebar
        open={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isSignedIn={isSignedIn}
      />

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onClose={() => setCartOpen(false)} />

      {/* Main Content */}
      <main className='flex-1 bg-[#fefaef] p-6'>
        {/* Categories */}
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Product Grid */}
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
