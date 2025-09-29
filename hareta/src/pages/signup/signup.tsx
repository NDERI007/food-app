import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabase/Client';
import { loginSchema, type LoginSchemaType } from '../../utils/schemas/auth';

export default function Signup() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaType) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: 'http://localhost:5173/dashboard', // or your production URL
        },
      });

      if (error) throw error;
      toast.success('Check your inbox for the login link!');
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-green-50'>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='w-full max-w-md rounded-xl bg-white p-8 shadow-lg'
      >
        <h2 className='mb-6 text-center text-2xl font-bold text-green-900'>
          What's yor email?
        </h2>

        <div className='mb-4 flex flex-col'>
          <input
            type='email'
            placeholder='Enter your email'
            {...register('email')}
            className={`rounded-md border p-2 focus:outline-none ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className='mt-1 text-sm text-red-500'>{errors.email.message}</p>
          )}
        </div>

        <button
          type='submit'
          className='w-full rounded-md bg-green-900 px-4 py-2 text-white transition-colors hover:bg-green-800'
        >
          Continue
        </button>
      </form>
    </div>
  );
}
