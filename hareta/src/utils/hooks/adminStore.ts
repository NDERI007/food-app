import { create } from 'zustand';
import axios from 'axios';
import type { MenuItem, Category, ProductVariant } from '@utils/schemas/menu';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AdminState {
  addCategory: (
    name: string,
    iconFile: File | null,
    queryClient: QueryClient,
  ) => Promise<void>;
  updateCategory: (
    id: string,
    name: string,
    iconFile: File | null,
    queryClient: QueryClient,
  ) => Promise<void>;
  deleteCategory: (id: string, queryClient: QueryClient) => Promise<void>;
  deleteMenuItem: (id: string, queryClient: QueryClient) => Promise<void>;
  toggleAvailability: (
    item: MenuItem,
    queryClient: QueryClient,
  ) => Promise<void>;
  // --- Variant methods ---
  addVariant: (
    product_id: string,
    data: Omit<ProductVariant, 'id' | 'product_id'>,
    queryClient: QueryClient,
  ) => Promise<void>;

  updateVariant: (
    variantId: string,
    product_id: string,
    data: Partial<ProductVariant>,
    queryClient: QueryClient,
  ) => Promise<void>;

  deleteVariant: (
    variantId: string,
    product_id: string,
    queryClient: QueryClient,
  ) => Promise<void>;
}

export const useAdminStore = create<AdminState>(() => ({
  addCategory: async (name, iconFile, queryClient) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (iconFile) {
        formData.append('icon', iconFile);
      }

      const res = await axios.post('/api/prod/categories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      queryClient.setQueryData<Category[]>(['categories'], (old) =>
        old ? [...old, res.data] : [res.data],
      );

      toast.success('Category created successfully');
    } catch (error) {
      toast.error('Failed to create category');
      throw error;
    }
  },

  updateCategory: async (id, name, iconFile, queryClient) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (iconFile) {
        formData.append('icon', iconFile);
      }

      const res = await axios.put(`/api/prod/categories/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      queryClient.setQueryData<Category[]>(['categories'], (old) =>
        old ? old.map((cat) => (cat.id === id ? res.data : cat)) : old,
      );

      toast.success('Category updated successfully');
    } catch (error) {
      toast.error('Failed to update category');
      throw error;
    }
  },

  deleteCategory: async (id, queryClient) => {
    try {
      await axios.delete(`/api/prod/categories/${id}`);
      queryClient.setQueryData<Category[]>(['categories'], (old) =>
        old ? old.filter((cat) => cat.id !== id) : old,
      );
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Failed to delete category');
      throw error;
    }
  },
  deleteMenuItem: async (id, queryClient) => {
    await axios.delete(`/api/prod/menu-items/${id}`);
    queryClient.setQueryData<MenuItem[]>(['menu-items'], (old) =>
      old ? old.filter((item) => item.id !== id) : old,
    );
  },

  toggleAvailability: async (item, queryClient) => {
    try {
      // 1. Optimistic update for instant feedback
      queryClient.setQueriesData<MenuItem[]>(
        { queryKey: ['menu-items'] },
        (old) =>
          old
            ? old.map((i) =>
                i.id === item.id ? { ...i, available: !i.available } : i,
              )
            : old,
      );

      // 2. API call
      await axios.patch(`/api/prod/menu-items/${item.id}/availability`, {
        available: !item.available,
      });

      toast.success(
        `${item.name} is now ${!item.available ? 'available' : 'unavailable'}`,
      );

      // Realtime will confirm the change, but optimistic update gives instant feedback
    } catch (error) {
      // 3. Rollback on error
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.error('Failed to update availability');
    }
  },

  // --- Variant Methods ---
  addVariant: async (product_id, data, queryClient) => {
    const res = await axios.post(
      `/api/prod/menu-items/${product_id}/variants`,
      data,
    );

    // Immediately refresh product data with new variant
    await queryClient.invalidateQueries({
      queryKey: ['product-variants', product_id],
    });
    return res.data;
  },

  updateVariant: async (variantId, product_id, data, queryClient) => {
    const res = await axios.put(
      `/api/prod/product-variants/${variantId}`,
      data,
    );

    // Optional: if productId known, invalidate that product
    if (product_id) {
      await queryClient.invalidateQueries({
        queryKey: ['product-variants', product_id],
      });
    }

    return res.data;
  },

  deleteVariant: async (variantId, product_id, queryClient) => {
    await axios.delete(`/api/prod/product-variants/${variantId}`);
    await queryClient.invalidateQueries({
      queryKey: ['product-variants', product_id],
    });
  },
}));
