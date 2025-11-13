import { useState, useMemo, useEffect } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';
import { ImageOff, Plus, Loader2, Check, X } from 'lucide-react';
import { useProductVariants } from '@utils/hooks/productStore';
import type { MenuItem, ProductVariant } from '@utils/schemas/menu';
import QuantitySelector from './quantitySel';

interface ProductCardProps {
  product: MenuItem;
}

function ProductCard({ product }: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  // Determine if product has a direct price or needs variants
  const hasDirectPrice = product.price !== null && product.price !== undefined;

  // Fetch full product details (including variants) only when modal opens
  const { data: variants = [], isLoading: loadingDetails } = useProductVariants(
    isOpen ? product.id : '',
  );

  const hasVariants = variants.length > 0;

  useEffect(() => {
    if (isOpen && hasVariants && !selectedVariant) {
      const firstAvailable = variants.find((v) => v.is_available);
      if (firstAvailable) {
        setSelectedVariant(firstAvailable);
      }
    }
  }, [isOpen, hasVariants, variants, selectedVariant]);

  function openModal() {
    if (!product.available) return;
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setQuantity(1);
    setSelectedVariant(null);
  }

  function handleAddFromModal() {
    // If product has variants, require variant selection
    if (!hasDirectPrice && !selectedVariant) return;
    addItem(product, quantity, selectedVariant ?? undefined);
    closeModal();
  }

  // Calculate current price based on product type
  const currentPrice = useMemo(() => {
    if (selectedVariant) return selectedVariant.price;
    if (hasDirectPrice) return product.price;
    // If no direct price and no variant selected yet, use first available variant price
    if (hasVariants) {
      const firstAvailable = variants.find((v) => v.is_available);
      return firstAvailable?.price ?? 0;
    }
    return 0;
  }, [selectedVariant, hasDirectPrice, product.price, hasVariants, variants]);

  const subtotal = currentPrice * quantity;

  // Calculate display price for card view
  const displayPrice = useMemo(() => {
    // If product has a direct price, show it
    if (hasDirectPrice) {
      return `KES ${product.price.toFixed(2)}`;
    }

    // If product uses variants, show price range from variants
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map((v) => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) return `KES ${minPrice.toFixed(2)}`;
      return `From KES ${minPrice.toFixed(2)}`;
    }

    // Fallback - shouldn't normally reach here
    return '';
  }, [hasDirectPrice, product.price, product.variants]);

  // Get image object if available
  const imageData = typeof product.image === 'object' ? product.image : null;
  const hasImageVariants =
    imageData?.variants?.avif && imageData?.variants?.jpg;

  return (
    <>
      {/* Cardless Design - Image with info below */}
      <div
        className={`group ${
          product.available ? 'cursor-pointer' : 'cursor-not-allowed'
        }`}
        onClick={openModal}
      >
        {/* Image Container - No border, just rounded */}
        <div className='relative mb-3 aspect-square overflow-hidden rounded-2xl bg-gray-100'>
          {/* LQIP blur placeholder */}
          {!error && imageData?.lqip && (
            <div
              className={`absolute inset-0 transition-opacity duration-500 ${
                loaded ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                backgroundImage: `url(${imageData.lqip})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(10px)',
                transform: 'scale(1.1)',
              }}
            />
          )}

          {/* Main Image */}
          <div className={!product.available ? 'grayscale' : ''}>
            {!error ? (
              hasImageVariants ? (
                <picture>
                  <source
                    srcSet={`${imageData.variants.avif[400]} 400w, ${imageData.variants.avif[800]} 800w`}
                    type='image/avif'
                    sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 300px'
                  />
                  <source
                    srcSet={`${imageData.variants.jpg[400]} 400w, ${imageData.variants.jpg[800]} 800w`}
                    type='image/jpeg'
                    sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 300px'
                  />
                  <img
                    src={imageData.variants.jpg[400]}
                    alt={product.name}
                    loading='lazy'
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
                      loaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                    }`}
                  />
                </picture>
              ) : (
                <img
                  src={typeof product.image === 'string' ? product.image : ''}
                  alt={product.name}
                  loading='lazy'
                  onLoad={() => setLoaded(true)}
                  onError={() => setError(true)}
                  className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
                    loaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                  }`}
                />
              )
            ) : (
              <div className='flex h-full items-center justify-center text-gray-400'>
                <ImageOff size={32} />
              </div>
            )}
          </div>

          {/* Unavailable Overlay */}
          {!product.available && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
              <span className='rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-900'>
                Unavailable
              </span>
            </div>
          )}

          {/* Add Button - Floating on hover */}
          {product.available && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openModal();
              }}
              className='absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95'
              aria-label='Add to cart'
            >
              <Plus className='h-5 w-5 text-green-600' />
            </button>
          )}
        </div>

        {/* Product Info Below */}
        <div className='space-y-1 text-center'>
          {/* Product Name */}
          <h3 className='line-clamp-2 text-sm font-semibold text-gray-900'>
            {product.name}
          </h3>

          {/* Price */}
          <p className='text-base font-bold text-green-600'>{displayPrice}</p>
        </div>
      </div>

      {/* Modal - FIXED: Better mobile responsiveness */}
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4'>
          {/* Backdrop */}
          <div
            className='absolute inset-0 bg-black/50 backdrop-blur-sm'
            onClick={closeModal}
            aria-hidden
          />

          {/* Panel - FIXED: Bottom sheet on mobile, centered modal on desktop */}
          <div className='relative z-10 max-h-[85vh] w-full overflow-auto rounded-t-2xl bg-white sm:mx-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl'>
            {/* Header - FIXED: Sticky header with better mobile padding */}
            <div className='sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-4 sm:p-5'>
              <h2 className='pr-8 text-base font-semibold text-gray-900 sm:text-lg'>
                {product.name}
              </h2>
              <button
                onClick={closeModal}
                aria-label='Close'
                className='absolute top-4 right-4 rounded-full p-1.5 text-gray-600 hover:bg-gray-100'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            {loadingDetails ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='h-6 w-6 animate-spin text-green-600' />
                <span className='ml-2 text-sm text-gray-600'>
                  Loading details...
                </span>
              </div>
            ) : (
              <div className='p-4 sm:p-5'>
                {/* Image - FIXED: Centered and properly sized for mobile */}
                <div className='mb-4 flex justify-center'>
                  {hasImageVariants ? (
                    <picture>
                      <source
                        srcSet={`${imageData.variants.avif[400]} 400w, ${imageData.variants.avif[800]} 800w`}
                        type='image/avif'
                        sizes='(max-width: 640px) 280px, 400px'
                      />
                      <source
                        srcSet={`${imageData.variants.jpg[400]} 400w, ${imageData.variants.jpg[800]} 800w`}
                        type='image/jpeg'
                        sizes='(max-width: 640px) 280px, 400px'
                      />
                      <img
                        src={imageData.variants.jpg[400]}
                        alt={product.name}
                        className='h-48 w-48 rounded-xl object-cover sm:h-56 sm:w-56'
                      />
                    </picture>
                  ) : (
                    <img
                      src={
                        typeof product.image === 'string' ? product.image : ''
                      }
                      alt={product.name}
                      className='h-48 w-48 rounded-xl object-cover sm:h-56 sm:w-56'
                    />
                  )}
                </div>

                {/* Variants Selection - FIXED: Better mobile layout */}
                {!hasDirectPrice && hasVariants && (
                  <div className='mb-4 space-y-3'>
                    <label className='text-sm font-medium text-gray-700'>
                      Select Size
                    </label>
                    <div className='flex flex-wrap gap-2'>
                      {variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          disabled={!variant.is_available}
                          className={`relative rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                            selectedVariant?.id === variant.id
                              ? 'bg-green-600 text-white shadow-sm'
                              : variant.is_available
                                ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                : 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400 line-through'
                          }`}
                        >
                          <span>{variant.size_name}</span>
                          {selectedVariant?.id === variant.id && (
                            <Check className='ml-1 inline-block h-3.5 w-3.5 sm:h-4 sm:w-4' />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className='text-sm text-gray-600'>
                      Price:{' '}
                      <span className='font-semibold text-green-600'>
                        KES {currentPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Show price directly for non-variant products */}
                {hasDirectPrice && (
                  <div className='mb-4 text-sm text-gray-600'>
                    Price:{' '}
                    <span className='font-semibold text-green-600'>
                      KES {product.price.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Quantity + Price summary - FIXED: Stacked on mobile */}
                <div className='mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-gray-700'>
                      Quantity
                    </span>
                    <QuantitySelector
                      quantity={quantity}
                      setQuantity={setQuantity}
                    />
                  </div>
                  <div className='flex items-center justify-between border-t border-gray-200 pt-3'>
                    <span className='text-sm text-gray-600'>Subtotal</span>
                    <span className='text-lg font-bold text-green-600 sm:text-xl'>
                      KES {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions - FIXED: Full width buttons on mobile */}
                <div className='flex flex-col gap-2 sm:flex-row sm:gap-3'>
                  <button
                    onClick={handleAddFromModal}
                    disabled={!hasDirectPrice && !selectedVariant}
                    className='flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:text-base'
                  >
                    {!hasDirectPrice && !selectedVariant
                      ? 'Select an option'
                      : `Add ${quantity > 1 ? `${quantity} ` : ''}to cart`}
                  </button>

                  <button
                    onClick={closeModal}
                    className='rounded-lg border border-gray-300 px-4 py-3 text-sm transition hover:bg-gray-50 sm:text-base'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
export default ProductCard;
