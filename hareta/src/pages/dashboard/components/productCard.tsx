import { memo, useState, useMemo, useEffect } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';
import { ImageOff, Plus, Loader2 } from 'lucide-react';
import { useMenuItem } from '@utils/hooks/productStore';
import type { MenuItem, ProductVariant } from '@utils/schemas/menu';
import QuantitySelector from './quantitySel';

interface ProductCardProps {
  product: MenuItem;
}

const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );

  const addItem = useCartStore((state) => state.addItem);

  // Fetch full product details (including variants) only when modal opens
  const { data: productDetails, isLoading: loadingDetails } = useMenuItem(
    isOpen ? product.id : '',
  );

  const variants = productDetails?.product_variants || [];
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
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setQuantity(1);
    setSelectedVariant(null);
  }

  function handleAddFromModal() {
    if (hasVariants && !selectedVariant) return; // Should not happen if button is disabled

    addItem(product, quantity, selectedVariant ?? undefined);

    closeModal();
  }
  const currentPrice = selectedVariant?.price ?? product.price;
  const subtotal = currentPrice * quantity;
  // Calculate display price based on variants
  const displayPrice = useMemo(() => {
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map((v) => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) return `KES ${minPrice.toFixed(2)}`;
      // A slightly cleaner way to show a range
      return `From KES ${minPrice.toFixed(2)}`;
    }
    return `KES ${product.price.toFixed(2)}`;
  }, [product.variants, product.price]);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Get image object if available
  const imageData = typeof product.image === 'object' ? product.image : null;
  const hasImageVariants =
    imageData?.variants?.avif && imageData?.variants?.jpg;

  return (
    <>
      <div
        className='group relative flex cursor-pointer flex-col rounded-xl bg-white p-3 shadow transition hover:shadow-lg sm:p-4'
        onClick={openModal}
      >
        {/* Image */}
        <div className='relative w-full overflow-hidden rounded-xl bg-gray-100'>
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

          {!error ? (
            hasImageVariants ? (
              <picture>
                <source
                  srcSet={`${imageData.variants.avif[400]} 400w, ${imageData.variants.avif[800]} 800w`}
                  type='image/avif'
                  sizes='(max-width: 640px) 200px, (max-width: 1024px) 300px, 400px'
                />
                <source
                  srcSet={`${imageData.variants.jpg[400]} 400w, ${imageData.variants.jpg[800]} 800w`}
                  type='image/jpeg'
                  sizes='(max-width: 640px) 200px, (max-width: 1024px) 300px, 400px'
                />
                <img
                  src={imageData.variants.jpg[400]}
                  alt={product.name}
                  loading='lazy'
                  onLoad={() => setLoaded(true)}
                  onError={() => setError(true)}
                  className={`h-32 w-full rounded-xl object-cover transition-all duration-500 sm:h-36 md:h-40 ${
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
                className={`h-32 w-full rounded-xl object-cover transition-all duration-500 sm:h-36 md:h-40 ${
                  loaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                }`}
              />
            )
          ) : (
            <div className='flex h-32 items-center justify-center text-gray-400 sm:h-36 md:h-40'>
              <ImageOff size={32} />
            </div>
          )}
        </div>

        {/* Name */}
        <div className='mt-3 flex-1'>
          <h3 className='line-clamp-2 text-sm font-medium sm:text-base'>
            {product.name}
          </h3>
        </div>

        {/* Price + Action */}
        <div className='mt-3 flex items-center justify-between'>
          <div>
            <span className='text-sm font-semibold text-green-600 sm:text-base'>
              {displayPrice}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
            className='flex items-center justify-center rounded-full bg-green-100 p-2 text-green-600 transition-colors hover:bg-green-200'
            aria-label='Add to cart'
          >
            <Plus size={16} className='sm:h-5 sm:w-5' />
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          {/* Backdrop */}
          <div
            className='absolute inset-0 bg-black/50'
            onClick={closeModal}
            aria-hidden
          />

          {/* Panel */}
          <div className='relative z-10 mx-auto max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6'>
            <div className='flex items-start justify-between'>
              <h2 className='text-lg font-semibold sm:text-xl'>
                {product.name}
              </h2>
              <button
                onClick={closeModal}
                aria-label='Close'
                className='rounded-full p-1 text-gray-600 hover:bg-gray-100'
              >
                ✕
              </button>
            </div>

            {loadingDetails ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin text-green-600' />
                <span className='ml-2 text-sm text-gray-600'>
                  Loading details...
                </span>
              </div>
            ) : productDetails ? (
              <div className='mt-4 grid gap-4 sm:gap-6 md:grid-cols-3'>
                {/* Image */}
                <div className='flex justify-center md:block'>
                  {hasImageVariants ? (
                    <picture>
                      <source
                        srcSet={`${imageData.variants.avif[800]} 800w, ${imageData.variants.avif[1200]} 1200w`}
                        type='image/avif'
                        sizes='(max-width: 768px) 200px, 400px'
                      />
                      <source
                        srcSet={`${imageData.variants.jpg[800]} 800w, ${imageData.variants.jpg[1200]} 1200w`}
                        type='image/jpeg'
                        sizes='(max-width: 768px) 200px, 400px'
                      />
                      <img
                        src={imageData.variants.jpg[800]}
                        alt={product.name}
                        className='h-32 w-32 rounded-lg object-cover sm:h-40 sm:w-40 md:h-48 md:w-full'
                      />
                    </picture>
                  ) : (
                    <img
                      src={
                        typeof product.image === 'string' ? product.image : ''
                      }
                      alt={product.name}
                      className='h-32 w-32 rounded-lg object-cover sm:h-40 sm:w-40 md:h-48 md:w-full'
                    />
                  )}
                </div>

                <div className='flex flex-col gap-4 md:col-span-2'>
                  <p className='text-sm text-gray-700'>
                    {productDetails.description || 'No description available.'}
                  </p>

                  {/* Variants Selection */}
                  {hasVariants && (
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                      {variants.map((variant) => (
                        <button
                          key={variant.id}
                          // Pass the entire object to state
                          onClick={() => setSelectedVariant(variant)}
                          disabled={!variant.is_available}
                          className={`... ${
                            // Compare by ID for selection state
                            selectedVariant?.id === variant.id
                              ? 'border-green-600 bg-green-50'
                              : '...'
                          }`}
                        >
                          <span>{variant.size_name}</span>
                          <span>KES {variant.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quantity + Price summary */}
                  <div className='flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
                    <QuantitySelector
                      quantity={quantity}
                      setQuantity={setQuantity}
                    />
                    <div className='text-left sm:text-right'>
                      <div className='text-xs text-gray-500 sm:text-sm'>
                        Subtotal
                      </div>
                      <div className='text-lg font-bold text-green-600 sm:text-xl'>
                        KES {subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className='flex flex-col gap-2 sm:flex-row sm:gap-3'>
                    <button
                      onClick={handleAddFromModal}
                      disabled={hasVariants && !selectedVariant}
                      className='flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:text-base'
                    >
                      {hasVariants && !selectedVariant
                        ? 'Select an option'
                        : `Add ${quantity > 1 ? `${quantity} ` : ''}to cart`}
                    </button>

                    <button
                      onClick={closeModal}
                      className='rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition hover:bg-gray-50 sm:text-base'
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex items-center justify-center py-8 text-gray-500'>
                <p>Failed to load product details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

export default ProductCard;
