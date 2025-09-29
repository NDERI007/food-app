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
    label: 'Breakfast',
    icon: <BrekoIcon className='h-full w-full' />,
  },
  {
    id: 'trad',
    label: 'Traditional',
    icon: <TradIcon className='h-full w-full' />,
  },
  { id: 'burger', label: 'Burger', icon: <span>🍔</span> },
  { id: 'pizza', label: 'Pizza', icon: <span>🍕</span> },
  { id: 'sushi', label: 'Sushi', icon: <span>🍣</span> },
  { id: 'drinks', label: 'Drinks', icon: <span>🥤</span> },
  { id: 'dessert', label: 'Dessert', icon: <span>🍩</span> },
  { id: 'chicken', label: 'Chicken', icon: <span>🍗</span> },
  { id: 'salad', label: 'Salad', icon: <span>🥗</span> },
  { id: 'vegan', label: 'Vegan', icon: <span>🥦</span> },
];

const products: Product[] = [
  {
    id: '1',
    name: 'Aloha Chicken',
    description: 'Reis, Zoodles, Garnelen, Sesame Dressing, Avocado',
    price: 29,
    image: 'https://source.unsplash.com/400x300/?chicken',
    discount: 15,
    category: 'breakfast',
  },
  {
    id: '2',
    name: 'Italian Cuisine',
    description: 'Pasta with fresh tomatoes and basil',
    price: 20,
    image: 'https://source.unsplash.com/400x300/?pasta',
    discount: 12,
    category: 'fries',
  },
  {
    id: '3',
    name: 'Sushi Deluxe',
    description: 'Fresh sushi platter with salmon and tuna',
    price: 35,
    image: 'https://source.unsplash.com/400x300/?sushi',
    discount: 18,
    category: 'trad',
  },
  {
    id: '4',
    name: 'Classic Burger',
    description: 'Juicy beef patty, cheddar cheese, and lettuce',
    price: 18,
    image: 'https://source.unsplash.com/400x300/?burger',
    discount: 10,
    category: 'burger',
  },
  {
    id: '5',
    name: 'Pepperoni Pizza',
    description: 'Stone-baked pizza with mozzarella and pepperoni',
    price: 25,
    image: 'https://source.unsplash.com/400x300/?pizza',
    discount: 20,
    category: 'pizza',
  },
  {
    id: '6',
    name: 'Vegan Salad Bowl',
    description: 'Mixed greens, avocado, chickpeas, and tahini dressing',
    price: 22,
    image: 'https://source.unsplash.com/400x300/?salad',
    discount: 8,
    category: 'breakfast',
  },
  {
    id: '7',
    name: 'French Fries Basket',
    description: 'Golden crispy fries with ketchup and mayo',
    price: 12,
    image: 'https://source.unsplash.com/400x300/?fries',
    discount: 5,
    category: 'fries',
  },
  {
    id: '8',
    name: 'Spicy Ramen',
    description: 'Noodles in spicy miso broth with pork and egg',
    price: 28,
    image: 'https://source.unsplash.com/400x300/?ramen',
    discount: 15,
    category: 'trad',
  },
  {
    id: '9',
    name: 'Avocado Toast',
    description: 'Toasted sourdough with smashed avocado and poached egg',
    price: 16,
    image: 'https://source.unsplash.com/400x300/?avocado-toast',
    discount: 7,
    category: 'breakfast',
  },
  {
    id: '10',
    name: 'Cheeseburger Combo',
    description: 'Beef burger, cheese, fries, and soft drink',
    price: 30,
    image: 'https://source.unsplash.com/400x300/?fastfood',
    discount: 12,
    category: 'burger',
  },
  {
    id: '11',
    name: 'Margherita Pizza',
    description: 'Classic pizza with tomato sauce, mozzarella, and basil',
    price: 24,
    image: 'https://source.unsplash.com/400x300/?margherita-pizza',
    discount: 10,
    category: 'pizza',
  },
  {
    id: '12',
    name: 'California Sushi Roll',
    description: 'Sushi rolls with crab, avocado, and cucumber',
    price: 27,
    image: 'https://source.unsplash.com/400x300/?sushi-roll',
    discount: 14,
    category: 'sushi',
  },
  {
    id: '13',
    name: 'Pancake Stack',
    description: 'Fluffy pancakes with maple syrup and berries',
    price: 19,
    image: 'https://source.unsplash.com/400x300/?pancakes',
    discount: 9,
    category: 'breakfast',
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
      <main className='flex-1 p-6'>
        {/* Categories */}
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Product Grid */}
        <div className='mt-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4'>
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
