import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';
import type { Category, MenuItem, ProductVariant } from '@utils/schemas/menu';
import { supabase } from '@utils/supabase/Client';
import { toast } from 'sonner';

/* ----------------------------- API FETCHERS ----------------------------- */
const fetchMenuItems = async (
  categoryId: string | null,
): Promise<MenuItem[]> => {
  // Start with the base URL
  let url = '/api/prod/menu-items';

  // If a category is selected (and it's not 'all'), add it as a query parameter
  if (categoryId && categoryId !== 'all') {
    url += `?category_id=${categoryId}`;
  }

  const { data } = await axios.get(url);
  return data;
};

const fetchCategories = async (): Promise<Category[]> => {
  const { data } = await axios.get('/api/prod/categories');
  return data;
};

// Fetch a single menu item (with variants)
const fetchMenuItemById = async (
  id: string,
): Promise<MenuItem & { product_variants: ProductVariant[] }> => {
  const { data } = await axios.get(`/api/prod/menu-items/${id}`);
  return data;
};

// Fetch variants for a single product (used when showing variants dynamically)
const fetchProductVariants = async (
  productId: string,
): Promise<ProductVariant[]> => {
  const { data } = await axios.get(
    `/api/prod/menu-items/${productId}/variants`,
  );
  return data;
};
/* ----------------------------- QUERY HOOKS ----------------------------- */
export function useMenuItems(categoryId: string | null) {
  return useQuery({
    // The query key now includes the categoryId.
    // This is crucial for caching!
    queryKey: ['menu-items', categoryId],

    // Pass the categoryId to the fetch function
    queryFn: () => fetchMenuItems(categoryId),

    staleTime: 1000 * 60 * 5, // 5 mins cache
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch product variants separately (if you want to show variants only on demand)
 */
export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => fetchProductVariants(productId),
    enabled: !!productId,
  });
}

/**
 * Listen to updates for a single product in realtime.
 * Keeps the cache in sync without refetching the entire list.
 */
export function useMenuItem(id: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['menu-item', id],
    queryFn: () => fetchMenuItemById(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;

    // Subscribe to updates only for this specific menu item
    const channel = supabase
      .channel(`menu-item-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_items',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Realtime update for item:', payload);

          // Update cached data in React Query
          queryClient.setQueryData(['menu-item', id], payload.new);

          // Optionally, also patch it in the "menu-items" list cache if present
          queryClient.setQueryData<MenuItem[]>(['menu-items'], (old) =>
            old
              ? old.map((item) =>
                  item.id === id ? (payload.new as MenuItem) : item,
                )
              : old,
          );
        },
      )
      /*Watch if the product is deleted */
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'menu_items',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Product deleted:', payload.old);

          // Remove the query data
          queryClient.removeQueries({ queryKey: ['menu-item', id] });

          toast.warning('This product was deleted');
          // Example: navigate('/admin/products');
        },
      )
      /*Invalidate only when a variant is added or removed */
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'product_variants',
          filter: `product_id=eq.${id}`,
        },
        () => {
          console.log('Variant added');
          queryClient.invalidateQueries({ queryKey: ['menu-item', id] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'product_variants',
          filter: `product_id=eq.${id}`,
        },
        () => {
          console.log('Variant removed');
          queryClient.invalidateQueries({ queryKey: ['menu-item', id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  return { data, isLoading, error };
}
