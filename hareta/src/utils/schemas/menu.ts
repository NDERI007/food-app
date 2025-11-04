export interface Category {
  id: string;
  name: string;
  icon_url: string | null;
}

export interface ImageVariants {
  id: string;
  lqip: string;
  variants: {
    avif: Record<number, string>;
    jpg: Record<number, string>;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: ImageVariants | null;
  available: boolean;
  category_id: string | null;
  variants?: ProductVariant[];
}
export interface ProductVariant {
  id: string;
  size_name: string;
  price: number;
  is_available: boolean;
}
