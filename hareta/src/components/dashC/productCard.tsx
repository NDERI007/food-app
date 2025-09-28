import React, { useState } from 'react';

// Types
export type ProductOption = {
  id: string;
  name: string; // e.g. "Size", "Extras"
  choices: { id: string; label: string; priceDelta?: number }[];
};

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image: string;
  category?: string | null;
  discount?: number | null;
  options?: ProductOption[]; // optional list of option groups for the product
};

type SelectedChoice = { optionId: string; choiceId: string };

type ProductCardProps = {
  product: Product;
  // Updated to pass selected choices + quantity when adding from the modal
  onAddToCart: (
    product: Product,
    selectedChoices?: SelectedChoice[],
    quantity?: number,
  ) => void;
};

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedChoices, setSelectedChoices] = useState<SelectedChoice[]>(() =>
    (product.options ?? []).map((opt) => ({
      optionId: opt.id,
      choiceId: opt.choices[0]?.id ?? '',
    })),
  );

  function openModal(e?: React.MouseEvent) {
    // prevent card click when clicking the Add button (handled separately)
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
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
    onAddToCart(product, selectedChoices, quantity);
    closeModal();
    setQuantity(1);
  }

  const displayPrice = `$${product.price.toFixed(2)}`;

  return (
    <>
      <div
        className='group relative flex cursor-pointer flex-col rounded-xl bg-white p-4 shadow transition hover:shadow-lg'
        onClick={openModal}
      >
        {/* Image only on the card (no description) */}
        <img
          src={product.image}
          alt={product.name}
          className='h-40 w-full rounded-xl object-cover'
        />

        {/* Name */}
        <div className='mt-3 flex-1'>
          <h3 className='text-lg font-semibold'>{product.name}</h3>
        </div>

        {/* Price + Action */}
        <div className='mt-4 flex items-center justify-between'>
          <div>
            {product.discount ? (
              <span className='mr-2 text-sm text-red-500'>
                -{product.discount}%
              </span>
            ) : (
              <span className='mr-2 text-sm text-gray-400'>&nbsp;</span>
            )}
            <span className='font-bold text-green-600'>{displayPrice}</span>
          </div>

          {/* Keep Add button but stop propagation so clicking Add doesn't open modal */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className='rounded-lg bg-green-600 px-3 py-1 text-white'
          >
            Add
          </button>
        </div>
      </div>

      {/* Modal (simple, accessible) */}
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

            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-3'>
              <img
                src={product.image}
                alt={product.name}
                className='col-span-1 max-h-48 w-full rounded-lg object-cover'
              />

              <div className='col-span-2'>
                <p className='text-sm text-gray-700'>
                  {product.description ?? 'No description available.'}
                </p>

                {/* Options */}
                {(product.options ?? []).length > 0 && (
                  <div className='mt-4 space-y-4'>
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
                                className={`rounded-md border px-3 py-1 text-sm ${selected ? 'border-green-600 font-semibold' : 'border-gray-300'}`}
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
                <div className='mt-6 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <label className='text-sm'>Quantity</label>
                    <div className='flex items-center gap-1'>
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className='rounded border px-2 py-1'
                        type='button'
                      >
                        -
                      </button>
                      <div className='w-10 text-center'>{quantity}</div>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className='rounded border px-2 py-1'
                        type='button'
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className='text-right'>
                    <div className='text-sm text-gray-500'>Unit</div>
                    <div className='text-lg font-bold'>{displayPrice}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className='mt-6 flex gap-3'>
                  <button
                    onClick={handleAddFromModal}
                    className='flex-1 rounded-lg bg-green-600 px-4 py-2 text-white'
                  >
                    Add to cart
                  </button>

                  <button
                    onClick={closeModal}
                    className='rounded-lg border px-4 py-2'
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
}
