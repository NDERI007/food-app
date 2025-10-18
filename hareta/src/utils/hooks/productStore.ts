import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';
import type { Category, MenuItem, ProductVariant } from '@utils/schemas/menu';
import { supabase } from '@utils/supabase/Client';

/* ----------------------------- API FETCHERS ----------------------------- */
const fetchMenuItems = async (
  categoryId?: string | null,
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
export function useMenuItems(categoryId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['menu-items', categoryId || 'all'],
    queryFn: () => fetchMenuItems(categoryId),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    console.log('Setting up realtime subscription for menu items');

    const channel = supabase
      .channel('menu_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
        },
        (payload) => {
          console.log('🔄 Realtime: Menu item changed:', payload);

          // Get all query keys that match ['menu-items', ...]
          const queries = queryClient.getQueriesData<MenuItem[]>({
            queryKey: ['menu-items'],
          });

          console.log('📊 Updating queries:', queries.length);

          // Update each matching query
          queries.forEach(([queryKey]) => {
            queryClient.setQueryData<MenuItem[]>(queryKey, (old) => {
              if (!old) return old;

              if (payload.eventType === 'DELETE') {
                console.log('❌ Removing item:', payload.old.id);
                return old.filter((item) => item.id !== payload.old.id);
              }

              if (payload.eventType === 'INSERT') {
                const newItem = payload.new as MenuItem;
                console.log('➕ Adding item:', newItem.id);

                // Check if item already exists (avoid duplicates)
                const exists = old.some((item) => item.id === newItem.id);
                if (exists) return old;

                // If we're viewing a specific category, only add if it matches
                const categoryFilter = queryKey[1];
                if (
                  categoryFilter &&
                  categoryFilter !== 'all' &&
                  newItem.category_id !== categoryFilter
                ) {
                  return old;
                }

                return [...old, newItem];
              }

              // UPDATE
              if (payload.eventType === 'UPDATE') {
                const updatedItem = payload.new as MenuItem;
                console.log('Updating item:', updatedItem.name);

                return old.map((item) =>
                  item.id === updatedItem.id
                    ? { ...item, ...updatedItem }
                    : item,
                );
              }

              return old;
            });
          });
        },
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => fetchProductVariants(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!productId) return;

    const channel = supabase
      .channel(`product-variants-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'product_variants',
          filter: `product_id=eq.${productId}`,
        },
        () => {
          console.log('Variant changed, refetching...');
          queryClient.invalidateQueries({
            queryKey: ['product-variants', productId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, queryClient]);

  return query;
}
