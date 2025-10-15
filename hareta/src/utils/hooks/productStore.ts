import { create } from 'zustand';
import axios from 'axios';

interface Category {
  id: string;
  name: string;
}
export interface ImageVariants {
  id: string;
  lqip: string;
  variants: {
    avif: Record<number, string>;
    jpg: Record<number, string>;
  };
}
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: ImageVariants | null;
  available: boolean;
  category_id: string | null;
}

interface AdminState {
  menuItems: MenuItem[];
  categories: Category[];
  loading: boolean;
  fetchMenuItems: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  addCategories: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleAvailability: (item: MenuItem) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  menuItems: [],
  categories: [],
  loading: false,

  fetchMenuItems: async () => {
    set({ loading: true });
    try {
      const res = await axios.get('/api/prod/menu-items');
      set({ menuItems: res.data });
    } catch (err) {
      console.error('Error fetching menu items:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const res = await axios.get('/api/prod/categories');
      set({ categories: res.data });
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  },

  addCategories: async (name: string) => {
    try {
      const res = await axios.post('/api/prod/categories', { name });
      set({ categories: [...get().categories, res.data] });
    } catch (err) {
      console.error('Error adding category:', err);
      throw err;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await axios.delete(`/api/prod/categories/${id}`);
      set({
        categories: get().categories.filter((cat) => cat.id !== id),
      });
    } catch (err) {
      console.error('Error deleting category:', err);

      throw err;
    }
  },

  deleteMenuItem: async (id) => {
    try {
      await axios.delete(`/api/prod/menu-items/${id}`);
      set({
        menuItems: get().menuItems.filter((item) => item.id !== id),
      });
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  },

  toggleAvailability: async (item) => {
    try {
      await axios.patch(`/api/prod/menu-items/${item.id}/availability`, {
        available: !item.available,
      });
      set({
        menuItems: get().menuItems.map((i) =>
          i.id === item.id ? { ...i, available: !i.available } : i,
        ),
      });
    } catch (err) {
      console.error('Error toggling availability:', err);
    }
  },
}));
