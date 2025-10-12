import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  available: boolean;
  category_id: string | null;
}

interface MenuItemForm {
  name: string;
  description: string;
  price: string;
  available: boolean;
  category_id: string;
  image: File | null;
}

const AdminProducts: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuItemForm>({
    name: '',
    description: '',
    price: '',
    available: true,
    category_id: '',
    image: null,
  });

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/menu-items`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('available', String(formData.available));
      formDataToSend.append('category_id', formData.category_id);
      if (formData.image) formDataToSend.append('image', formData.image);

      if (editingId) {
        await axios.put(
          `${API_BASE_URL}/menu-items/${editingId}`,
          formDataToSend,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
      } else {
        await axios.post(`${API_BASE_URL}/menu-items`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setFormData({
        name: '',
        description: '',
        price: '',
        available: true,
        category_id: '',
        image: null,
      });
      setImagePreview(null);
      setEditingId(null);
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Error saving menu item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      available: item.available,
      category_id: item.category_id || '',
      image: null,
    });
    setImagePreview(item.image_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`${API_BASE_URL}/menu-items/${id}`);
        fetchMenuItems();
      } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Error deleting menu item.');
      }
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await axios.patch(`${API_BASE_URL}/menu-items/${item.id}/availability`, {
        available: !item.available,
      });
      fetchMenuItems();
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  return (
    <div className='mx-auto max-w-6xl p-6 font-sans'>
      <h1 className='mb-8 text-3xl font-bold text-gray-800'>
        Manage Food Products
      </h1>

      {/* Form Section */}
      <div className='mb-8 rounded-xl bg-white p-6 shadow'>
        <h2 className='mb-4 text-xl font-semibold'>
          {editingId ? 'Edit Product' : 'Add New Product'}
        </h2>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <div>
              <label className='mb-1 block font-medium text-gray-700'>
                Product Name *
              </label>
              <input
                type='text'
                name='name'
                value={formData.name}
                onChange={handleInputChange}
                required
                className='w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
              />
            </div>

            <div>
              <label className='mb-1 block font-medium text-gray-700'>
                Price *
              </label>
              <input
                type='number'
                name='price'
                value={formData.price}
                onChange={handleInputChange}
                required
                step='0.01'
                className='w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
              />
            </div>

            <div>
              <label className='mb-1 block font-medium text-gray-700'>
                Category
              </label>
              <select
                name='category_id'
                value={formData.category_id}
                onChange={handleInputChange}
                className='w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
              >
                <option value=''>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='flex items-center space-x-2'>
              <input
                type='checkbox'
                id='available'
                name='available'
                checked={formData.available}
                onChange={handleInputChange}
                className='h-5 w-5 accent-green-600'
              />
              <label htmlFor='available' className='text-gray-700'>
                Available for order
              </label>
            </div>
          </div>

          <div>
            <label className='mb-1 block font-medium text-gray-700'>
              Description
            </label>
            <textarea
              name='description'
              value={formData.description}
              onChange={handleInputChange}
              className='min-h-[100px] w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-green-500 focus:outline-none'
            />
          </div>

          <div>
            <label
              htmlFor='image'
              className='inline-block w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-3 text-center text-gray-600 transition hover:bg-gray-50'
            >
              📷 Upload Product Image
              <input
                type='file'
                id='image'
                accept='image/*'
                onChange={handleImageChange}
                className='hidden'
              />
            </label>
            {imagePreview && (
              <img
                src={imagePreview}
                alt='Preview'
                className='mt-3 h-40 w-40 rounded-lg object-cover shadow'
              />
            )}
          </div>

          <div className='flex gap-3'>
            <button
              type='submit'
              disabled={loading}
              className='rounded-lg bg-green-600 px-6 py-2 text-white transition hover:bg-green-700 disabled:bg-gray-400'
            >
              {loading
                ? 'Saving...'
                : editingId
                  ? 'Update Product'
                  : 'Add Product'}
            </button>
            {editingId && (
              <button
                type='button'
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    available: true,
                    category_id: '',
                    image: null,
                  });
                  setImagePreview(null);
                }}
                className='rounded-lg bg-gray-500 px-6 py-2 text-white transition hover:bg-gray-600'
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Product List */}
      <div className='rounded-xl bg-white p-6 shadow'>
        <h2 className='mb-4 text-xl font-semibold'>Product List</h2>
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {menuItems.map((item) => (
            <div
              key={item.id}
              className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow transition hover:shadow-lg'
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className='h-48 w-full object-cover'
                />
              ) : (
                <div className='flex h-48 items-center justify-center bg-gray-100 text-gray-400'>
                  No Image
                </div>
              )}
              <div className='p-4'>
                <div className='mb-2 flex items-start justify-between'>
                  <h3 className='text-lg font-bold text-gray-800'>
                    {item.name}
                  </h3>
                  <p className='font-semibold text-green-600'>${item.price}</p>
                </div>
                <p className='mb-3 text-sm text-gray-600'>
                  {item.description || 'No description available'}
                </p>
                <div className='flex items-center justify-between border-t pt-3'>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      item.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.available ? 'Available' : 'Unavailable'}
                  </span>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => toggleAvailability(item)}
                      className='rounded-lg bg-sky-500 px-3 py-1 text-sm text-white hover:bg-sky-600'
                    >
                      Toggle
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className='rounded-lg bg-yellow-400 px-3 py-1 text-sm text-black hover:bg-yellow-500'
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className='rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700'
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {menuItems.length === 0 && (
            <p className='col-span-full text-center text-gray-500'>
              No products found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
