// ProductCard.tsx
import { memo, useState } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';

interface SelectedChoice {
  optionId: string;
  choiceId: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  discount?: number;
  category: string;
  options?: Array<{
    id: string;
    name: string;
    choices: Array<{
      id: string;
      label: string;
      priceDelta?: number;
    }>;
  }>;
}
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    description?: string;
    discount?: number;
    options?: Array<{
      id: string;
      name: string;
      choices: Array<{
        id: string;
        label: string;
        priceDelta?: number;
      }>;
    }>;
  };
}

const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedChoices, setSelectedChoices] = useState<SelectedChoice[]>(() =>
    (product.options ?? []).map((opt) => ({
      optionId: opt.id,
      choiceId: opt.choices[0]?.id ?? '',
    })),
  );

  const addItem = useCartStore((state) => state.addItem);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    // Reset to defaults when closing
    setQuantity(1);
    setSelectedChoices(
      (product.options ?? []).map((opt) => ({
        optionId: opt.id,
        choiceId: opt.choices[0]?.id ?? '',
      })),
    );
  }

  function handleChoiceChange(optionId: string, choiceId: string) {
    setSelectedChoices((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((s) => s.optionId === optionId);
      if (idx >= 0) copy[idx] = { optionId, choiceId };
      else copy.push({ optionId, choiceId });
      return copy;
    });
  }

  function handleAddFromModal() {
    // Pass quantity and selectedChoices to the store
    addItem(product, quantity, selectedChoices);
    closeModal();
  }

  // Calculate display price including selected options
  const calculateDisplayPrice = () => {
    let price = product.price;

    selectedChoices.forEach((selected) => {
      const option = product.options?.find(
        (opt) => opt.id === selected.optionId,
      );
      if (option) {
        const choice = option.choices.find((c) => c.id === selected.choiceId);
        if (choice?.priceDelta) {
          price += choice.priceDelta;
        }
      }
    });

    return price;
  };

  const displayPrice = `$${calculateDisplayPrice().toFixed(2)}`;
  const basePrice = `$${product.price.toFixed(2)}`;

  return (
    <>
      <div
        className='group relative flex cursor-pointer flex-col rounded-xl bg-white p-3 shadow transition hover:shadow-lg sm:p-4'
        onClick={openModal}
      >
        {/* Image */}
        <img
          src={product.image}
          alt={product.name}
          className='h-32 w-full rounded-xl object-cover sm:h-36 md:h-40 lg:h-44'
        />

        {/* Name */}
        <div className='mt-3 flex-1'>
          <h3 className='text-base font-semibold sm:text-lg'>{product.name}</h3>
        </div>

        {/* Price + Action */}
        <div className='mt-3 flex items-center justify-between'>
          <div>
            {product.discount ? (
              <span className='mr-2 text-sm text-red-500'>
                -{product.discount}%
              </span>
            ) : (
              <span className='mr-2 text-sm text-gray-400'>&nbsp;</span>
            )}
            <span className='text-sm font-bold text-green-600 sm:text-base'>
              {basePrice}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent modal from opening
              if ((product.options ?? []).length > 0) {
                // Has options, open modal
                openModal();
              } else {
                // No options, add directly
                addItem(product, 1, []);
              }
            }}
            className='rounded-lg bg-green-600 px-2 py-1 text-xs text-white sm:px-3 sm:py-1.5 sm:text-sm'
          >
            Add
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          {/* Backdrop */}
          <div
            className='absolute inset-0 bg-black/40'
            onClick={closeModal}
            aria-hidden
          />

          {/* Panel */}
          <div className='relative z-10 mx-4 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl'>
            <div className='flex items-start justify-between'>
              <h2 className='text-xl font-semibold'>{product.name}</h2>
              <button
                onClick={closeModal}
                aria-label='Close'
                className='rounded-full p-1 text-gray-600 hover:bg-gray-100'
              >
                ✕
              </button>
            </div>

            <div className='mt-4 grid gap-6 md:grid-cols-3'>
              {/* Image */}
              <div className='flex justify-center md:block'>
                <img
                  src={product.image}
                  alt={product.name}
                  className='h-40 w-40 rounded-lg object-cover md:h-48 md:w-full'
                />
              </div>

              <div className='flex flex-col gap-4 md:col-span-2'>
                <p className='text-sm text-gray-700'>
                  {product.description ?? 'No description available.'}
                </p>

                {/* Options */}
                {(product.options ?? []).length > 0 && (
                  <div className='space-y-4'>
                    {(product.options ?? []).map((opt) => (
                      <div key={opt.id} className='space-y-2'>
                        <div className='text-sm font-medium'>{opt.name}</div>
                        <div className='flex flex-wrap gap-2'>
                          {opt.choices.map((c) => {
                            const selected =
                              selectedChoices.find((s) => s.optionId === opt.id)
                                ?.choiceId === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => handleChoiceChange(opt.id, c.id)}
                                className={`rounded-md border px-3 py-1 text-sm transition ${
                                  selected
                                    ? 'border-green-600 bg-green-50 font-semibold text-green-700'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                                type='button'
                              >
                                {c.label}
                                {c.priceDelta
                                  ? ` (+$${c.priceDelta.toFixed(2)})`
                                  : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quantity + Price summary */}
                <div className='flex items-center justify-between border-t pt-4'>
                  <div className='flex items-center gap-2'>
                    <label className='text-sm font-medium'>Quantity</label>
                    <div className='flex items-center gap-1'>
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className='rounded border border-gray-300 px-3 py-1 hover:bg-gray-50'
                        type='button'
                      >
                        -
                      </button>
                      <div className='w-12 text-center font-medium'>
                        {quantity}
                      </div>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className='rounded border border-gray-300 px-3 py-1 hover:bg-gray-50'
                        type='button'
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className='text-right'>
                    <div className='text-sm text-gray-500'>Subtotal</div>
                    <div className='text-xl font-bold text-green-600'>
                      ${(calculateDisplayPrice() * quantity).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex gap-3'>
                  <button
                    onClick={handleAddFromModal}
                    className='flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700'
                  >
                    Add {quantity > 1 ? `${quantity} ` : ''}to cart
                  </button>

                  <button
                    onClick={closeModal}
                    className='rounded-lg border border-gray-300 px-4 py-2 transition hover:bg-gray-50'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ProductCard;
