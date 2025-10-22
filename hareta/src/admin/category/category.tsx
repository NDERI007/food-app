import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Plus, X, Save, FolderOpen } from 'lucide-react';
import type { Category } from '@utils/schemas/menu';
import { toast } from 'sonner';
import { useAdminStore } from '@utils/hooks/adminStore';
import { useCategories } from '@utils/hooks/productStore';

export default function CategoryManager() {
  const queryClient = useQueryClient();
  const { addCategory, updateCategory, deleteCategory } = useAdminStore();

  const { data: categories = [], isLoading } = useCategories();

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        toast.error('File size must be less than 3MB');
        return;
      }
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setIconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openModal = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name });
      setIconPreview(category.icon_url || null);
    } else {
      setEditingCategory(null);
      setFormData({ name: '' });
      setIconPreview(null);
    }
    setIconFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '' });
    setIconFile(null);
    setIconPreview(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(
          editingCategory.id,
          formData.name,
          iconFile,
          queryClient,
        );
      } else {
        await addCategory(formData.name, iconFile, queryClient);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id, queryClient);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const removeIcon = () => {
    setIconFile(null);
    setIconPreview(editingCategory?.icon_url || null);
  };

  return (
    <div className='min-h-screen bg-[#fefaef] p-4 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='mb-1 text-2xl font-bold text-green-900 sm:text-3xl'>
              Category Management
            </h1>
            <p className='text-sm text-green-900/80 sm:text-base'>
              Organize your products with custom categories
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <button
              onClick={() => openModal()}
              className='inline-flex items-center gap-2 rounded-lg bg-green-900 px-4 py-2 font-medium text-white shadow-md shadow-green-900/20 transition-colors hover:bg-green-800 focus:ring-2 focus:ring-green-300 focus:outline-none sm:px-6'
            >
              <Plus size={16} />
              <span className='text-sm'>New</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className='py-6 text-center'>
            <div className='inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-green-900'></div>
          </div>
        ) : categories.length === 0 ? (
          <div className='rounded-2xl border-2 border-dashed border-green-200 bg-[#fffefb] px-4 py-8 text-center'>
            <FolderOpen size={56} className='mx-auto mb-3 text-green-200' />
            <h3 className='mb-2 text-lg font-semibold text-green-900'>
              No categories yet
            </h3>
            <p className='mb-4 text-sm text-green-900/80'>
              Get started by creating your first category
            </p>
            <button
              onClick={() => openModal()}
              className='inline-flex items-center gap-2 rounded-lg bg-green-900 px-4 py-2 font-medium text-white transition-colors hover:bg-green-800'
            >
              <Plus size={18} /> Create Category
            </button>
          </div>
        ) : (
          /* Grid mode only: icon-only tiles with normal spacing between tiles */
          <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'>
            {categories.map((category) => (
              <div
                key={category.id}
                className='flex flex-col items-center rounded-2xl bg-[#fefaef] p-4 shadow-md transition-transform hover:scale-105'
              >
                <div className='flex h-20 w-20 items-center justify-center rounded-xl bg-green-50'>
                  {category.icon_url ? (
                    <img
                      src={category.icon_url}
                      alt={category.name}
                      className='h-12 w-12 object-contain'
                    />
                  ) : (
                    <FolderOpen className='text-green-900' size={32} />
                  )}
                </div>

                <p className='mt-3 truncate text-center text-base font-medium text-green-900'>
                  {category.name}
                </p>

                <div className='mt-4 flex w-full items-center justify-between gap-2'>
                  {/* Edit Button - violet theme */}
                  <button
                    onClick={() => openModal(category)}
                    className='flex-1 rounded-lg bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-200 active:bg-violet-300'
                  >
                    Edit
                  </button>

                  {/* Delete Button - red theme */}
                  <button
                    onClick={() => setDeleteConfirm(category.id)}
                    className='flex-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 active:bg-red-200'
                  >
                    Delete
                  </button>
                </div>

                {/* Delete confirm modal (grid) */}
                {deleteConfirm === category.id && (
                  <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
                    <div className='w-full max-w-sm rounded-lg bg-white p-4 shadow-lg'>
                      <p className='mb-3 text-sm font-medium text-green-900'>
                        Delete "{category.name}"?
                      </p>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className='rounded-md border border-green-100 bg-white px-3 py-1 text-sm text-green-900 hover:bg-green-50'
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className='rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700'
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal for create/edit (unchanged) */}
        {showModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4'>
            <div className='max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[#fefaf6] shadow-2xl'>
              <div className='sticky top-0 flex items-center justify-between rounded-t-2xl border-b border-[#fff1ec] bg-[#fefaf6] px-5 py-3'>
                <h2 className='text-lg font-bold text-green-900 sm:text-xl'>
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h2>
                <button
                  onClick={closeModal}
                  className='rounded-lg p-2 transition-colors hover:bg-[#fff1ec] focus:outline-none'
                >
                  <X size={20} />
                </button>
              </div>

              <div className='space-y-5 p-5'>
                <div>
                  <label className='mb-2 block text-sm font-medium text-green-900'>
                    Category Icon
                  </label>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#fff2ec] bg-white'>
                      {iconPreview ? (
                        <img
                          src={iconPreview}
                          alt='Preview'
                          className='h-16 w-16 object-contain'
                        />
                      ) : (
                        <Upload size={32} className='text-green-200' />
                      )}
                    </div>

                    <div className='flex-1 space-y-2'>
                      <label className='block'>
                        <input
                          type='file'
                          accept='image/*,.svg'
                          onChange={handleFileChange}
                          className='hidden'
                        />
                        <span className='inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-green-900 shadow-sm transition-colors hover:bg-green-50'>
                          <Upload size={16} />
                          {iconPreview ? 'Change Icon' : 'Upload Icon'}
                        </span>
                      </label>
                      {iconPreview && (
                        <button
                          type='button'
                          onClick={removeIcon}
                          className='block text-sm text-red-700 hover:text-red-800'
                        >
                          Remove icon
                        </button>
                      )}
                      <p className='text-xs text-green-900/70'>
                        SVG or PNG (max 3MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-green-900'>
                    Category Name <span className='text-red-600'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='e.g., Electronics, Fashion, Food'
                    className='w-full rounded-lg border border-[#fff2ec] px-4 py-3 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-green-300'
                  />
                </div>

                <div className='flex flex-col gap-3 pt-1 sm:flex-row'>
                  <button
                    type='button'
                    onClick={closeModal}
                    className='w-full rounded-lg bg-white px-4 py-3 font-medium text-green-900 transition-colors hover:bg-green-50 sm:flex-1'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-900 px-4 py-3 font-medium text-white transition-colors hover:bg-green-800 disabled:bg-green-600 sm:flex sm:flex-1'
                  >
                    {submitting ? (
                      <>
                        <div className='h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white'></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        {editingCategory ? 'Update' : 'Create'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
