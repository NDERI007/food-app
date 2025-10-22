import type { ImageVariants } from '@utils/schemas/menu';

export const getImageUrl = (image: string | ImageVariants | null) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  const variants = image.variants;
  if (!variants) return '';

  const sizes = [400, 800]; // preferred order of sizes

  // Try avif first, then jpg
  for (const size of sizes) {
    if (variants.avif?.[size]) return variants.avif[size];
  }

  for (const size of sizes) {
    if (variants.jpg?.[size]) return variants.jpg[size];
  }

  return '';
};
