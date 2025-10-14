import React, { useEffect, useRef, useState } from 'react';
import { useAdminStore } from '@utils/hooks/productStore';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';

const PALETTES = [
  { start: '#FB7185', end: '#F59E0B', accent: '#FB7185' }, // pink -> orange
  { start: '#6366F1', end: '#A78BFA', accent: '#6366F1' }, // indigo -> purple
  { start: '#10B981', end: '#06B6D4', accent: '#10B981' }, // green -> teal
  { start: '#F97316', end: '#FB7185', accent: '#F97316' }, // orange -> pink
  { start: '#06B6D4', end: '#3B82F6', accent: '#06B6D4' }, // cyan -> blue
  { start: '#34D399', end: '#84CC16', accent: '#34D399' }, // emerald -> lime
];

/** Deterministic palette from UUID (uses last 8 hex chars) */
function pickPaletteFromUUID(id: string) {
  if (!id) return PALETTES[0];
  try {
    const cleaned = id.replace(/-/g, '');
    const last8 = cleaned.slice(-8);
    const num = parseInt(last8, 16);
    return PALETTES[num % PALETTES.length];
  } catch {
    return PALETTES[0];
  }
}

/** Convert hex to rgba string with provided alpha */
function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CategoriesPage: React.FC = () => {
  const {
    categories,
    loading,
    fetchCategories,
    addCategories,
    deleteCategory,
  } = useAdminStore();

  const [showDialog, setShowDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // For inline delete confirmation popover
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // containerRef used to detect clicks outside popovers and close them
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Close pending delete popover when user clicks outside the container (or anywhere)
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) {
        setPendingDeleteId(null);
        return;
      }

      // if click is inside a popover or on a delete button, keep it
      if (
        target.closest('[data-popover]') ||
        target.closest('[data-delete-button]')
      ) {
        return;
      }

      // otherwise close
      setPendingDeleteId(null);
    }

    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  const handleAddCategory = async (e: React.FormEvent | any) => {
    e?.preventDefault?.();
    if (!newCategoryName.trim()) return;
    try {
      setSubmitting(true);
      await addCategories(newCategoryName.trim());
      setNewCategoryName('');
      setShowDialog(false);
    } catch (err) {
      console.error('Error creating category:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteCategory(id);
      setPendingDeleteId(null);
    } catch (err) {
      console.error('Error deleting category:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className='mx-auto max-w-4xl p-6' ref={containerRef}>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-800'>Categories</h1>
          <p className='mt-1 text-gray-600'>Manage your product categories</p>
        </div>

        <div>
          <button
            onClick={() => setShowDialog(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 px-4 py-2 text-white shadow-md transition hover:scale-105'
          >
            <Plus size={16} />
            New Category
          </button>
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
        </div>
      ) : categories.length === 0 ? (
        <div className='rounded-xl bg-white p-12 text-center shadow'>
          <div className='mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-gray-300'>
            <svg
              className='h-8 w-8'
              viewBox='0 0 24 24'
              fill='none'
              aria-hidden
            >
              <path
                d='M3 7h18'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
              <path
                d='M5 7v10a2 2 0 0 0 2 2h10'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </div>
          <h3 className='mb-2 text-xl font-semibold text-gray-700'>
            No categories yet
          </h3>
          <p className='mb-6 text-gray-500'>
            Get started by creating your first category
          </p>
          <button
            onClick={() => setShowDialog(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700'
          >
            <Plus size={18} />
            Create Category
          </button>
        </div>
      ) : (
        <div className='rounded-xl bg-white p-4 shadow'>
          <div
            className='grid gap-3'
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            }}
          >
            {categories.map((category) => {
              const pal = pickPaletteFromUUID(category.id);

              // light gradient background derived from palette
              const bgGradient = `linear-gradient(90deg, ${hexToRgba(pal.start, 0.06)}, ${hexToRgba(pal.end, 0.06)})`;

              // gradient for underline (solid gradient)
              const underlineGradient = `linear-gradient(90deg, ${pal.start}, ${pal.end})`;

              const isPending = pendingDeleteId === category.id;
              const isDeleting = deletingId === category.id;

              return (
                <div
                  key={category.id}
                  className='group relative flex items-center justify-between overflow-visible rounded-lg px-3 py-2 shadow-sm transition-transform focus-within:scale-[1.01] hover:scale-[1.01]'
                  style={{
                    borderLeft: `4px solid ${pal.start}`,
                    background: bgGradient,
                  }}
                  tabIndex={0}
                  role='button'
                  aria-label={`Category ${category.name}`}
                >
                  {/* ripple */}
                  <span
                    aria-hidden
                    className='ripple pointer-events-none absolute inset-0 scale-0 transform transition duration-500'
                    style={{ background: pal.end, opacity: 0.06 }}
                  />

                  <div className='flex w-full items-center gap-3'>
                    <div className='flex min-w-0 flex-col'>
                      <div
                        className='text-md truncate'
                        title={category.name}
                        style={{ color: '#111827' }}
                      >
                        {category.name}
                      </div>

                      {/* small gradient underline that expands on hover */}
                      <div
                        className='small-underline mt-2 h-1 rounded-full transition-all duration-300'
                        style={{
                          width: '0%',
                          background: underlineGradient,
                        }}
                      />
                    </div>

                    <div className='ml-auto hidden truncate text-xs text-gray-400 md:block'>
                      {category.id.slice(0, 8)}
                    </div>
                  </div>

                  {/* Delete button (opens inline confirmation popover) */}
                  <div className='relative ml-3 flex items-center gap-2'>
                    <button
                      // mark attribute so outside-click handler won't immediately close the popover when we click the button
                      data-delete-button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDeleteId((cur) =>
                          cur === category.id ? null : category.id,
                        );
                      }}
                      className='z-10 rounded-md p-1 transition hover:bg-red-50'
                      aria-label={`Delete ${category.name}`}
                      title='Delete'
                      style={{ color: pal.accent }}
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Inline confirmation popover */}
                    {isPending && (
                      <div
                        data-popover
                        onClick={(e) => e.stopPropagation()}
                        className='absolute top-full right-0 z-20 mt-2 w-[220px] rounded-md border bg-white px-3 py-2 shadow-lg'
                        role='dialog'
                        aria-label={`Confirm delete ${category.name}`}
                      >
                        <div className='mb-2 text-sm text-gray-800'>
                          Delete{' '}
                          <span className='font-semibold'>{category.name}</span>
                          ?
                        </div>

                        <div className='flex gap-2'>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            className='flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 transition hover:bg-gray-50'
                          >
                            Cancel
                          </button>

                          <button
                            onClick={async () =>
                              await handleConfirmDelete(category.id)
                            }
                            className='flex-1 rounded-md bg-red-600 px-2 py-1 text-sm text-white transition hover:bg-red-700 disabled:opacity-60'
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <span className='inline-flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                Deleting...
                              </span>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* absolute large underline that scales on hover (gradient) */}
                  <div
                    aria-hidden
                    className='chip-underline absolute right-3 bottom-2 left-4 h-1 rounded-full transition-all duration-300'
                    style={{
                      background: underlineGradient,
                      transformOrigin: 'left center',
                      transform: 'scaleX(0)',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Category Dialog */}
      {showDialog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-gray-800'>
                Add New Category
              </h2>
              <button
                onClick={() => {
                  setShowDialog(false);
                  setNewCategoryName('');
                }}
                className='rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
                disabled={submitting}
              >
                <X size={24} />
              </button>
            </div>

            <div className='mb-6'>
              <label
                htmlFor='categoryName'
                className='mb-2 block font-medium text-gray-700'
              >
                Category Name
              </label>
              <input
                id='categoryName'
                type='text'
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder='Enter category name'
                className='w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                autoFocus
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting) {
                    handleAddCategory(e);
                  }
                }}
              />
            </div>

            <div className='flex gap-3'>
              <button
                onClick={handleAddCategory}
                disabled={submitting || !newCategoryName.trim()}
                className='flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300'
              >
                {submitting ? (
                  <>
                    <Loader2 className='h-5 w-5 animate-spin' />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Category
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDialog(false);
                  setNewCategoryName('');
                }}
                disabled={submitting}
                className='rounded-lg bg-gray-200 px-4 py-3 text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local CSS for hover/ripple/underline behavior. Move into global CSS if you prefer. */}
      <style>{`
        .group:hover .chip-underline,
        .group:focus-within .chip-underline {
          transform: scaleX(1);
        }

        .group:hover .ripple,
        .group:focus-within .ripple {
          transform: scale(1);
          opacity: 0.06;
        }

        .group:hover .small-underline,
        .group:focus-within .small-underline {
          width: 100% !important;
        }

        /* ensure popover visually appears over other chips */
        [data-popover] { z-index: 60; }
      `}</style>
    </div>
  );
};

export default CategoriesPage;
