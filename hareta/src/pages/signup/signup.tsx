import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  emailSchema,
  otpSchema,
  type emailSchemaType,
  type OtpSchemaType,
} from '@utils/schemas/auth';
import { useAuth } from '@utils/hooks/useAuth';

export default function Signup() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  // Step 1 form (email + username)
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
    reset: resetSignup,
  } = useForm<emailSchemaType>({
    resolver: zodResolver(emailSchema),
  });

  // Step 2 form (otp)
  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: otpErrors },
    reset: resetOtp,
  } = useForm<OtpSchemaType>({
    resolver: zodResolver(otpSchema),
  });

  // Handlers
  const handleSendOtp = async (data: emailSchemaType) => {
    try {
      await axios.post(
        '/api/auth/send-otp',
        { email: data.email },
        { withCredentials: true },
      );

      toast.success('OTP sent! Check your inbox.');
      setEmail(data.email);
      setStep(2);

      resetSignup();
      setDisabled(true);
      setTimeout(() => setDisabled(false), 30_000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const backendMsg = (err.response?.data as { error?: string })?.error;
        toast.error(backendMsg || 'Failed to send OTP');
      } else {
        toast.error('Unexpected error occurred');
      }
    }
  };

  const handleVerifyOtp = async (data: OtpSchemaType) => {
    setIsVerifying(true);
    try {
      await axios.post(
        '/api/auth/verify-otp',
        { email, code: data.otp },
        { withCredentials: true },
      );
      // Hydrate AuthContext from server session
      const user = await checkAuth();

      if (!user) {
        setIsVerifying(false);
        toast.error('Authentication failed. Please try again.');
        return;
      }

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: unknown) {
      setIsVerifying(false);
      if (axios.isAxiosError(err)) {
        const backendMsg = (err.response?.data as { error?: string })?.error;
        toast.error(backendMsg || 'Failed to verify OTP');
      } else {
        toast.error('Unexpected error occurred');
      }
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-green-50'>
      <div className='w-full max-w-md rounded-xl bg-white p-8 shadow-lg'>
        {step === 1 && (
          <form onSubmit={handleSubmitSignup(handleSendOtp)}>
            <h2 className='mb-6 text-center text-2xl font-bold text-green-900'>
              Create your account
            </h2>

            {/* Email field */}
            <div className='mb-4 flex flex-col'>
              <label className='mb-1 text-sm font-medium text-gray-700'>
                Email
              </label>
              <input
                type='email'
                placeholder='Enter your email'
                {...registerSignup('email')}
                className={`rounded-md border p-2 focus:outline-none ${
                  signupErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {signupErrors.email && (
                <p className='mt-1 text-sm text-red-500'>
                  {signupErrors.email.message}
                </p>
              )}
            </div>

            <button
              type='submit'
              disabled={disabled}
              className={`w-full rounded-md px-4 py-2 text-white transition-all duration-150 ${
                disabled
                  ? 'cursor-not-allowed bg-gray-400 shadow-none'
                  : 'bg-green-900 shadow-md hover:bg-green-800 hover:shadow-lg active:scale-95 active:bg-green-950 active:shadow-inner'
              }`}
            >
              {disabled ? 'Please wait...' : 'Continue'}
            </button>

            {/* Link to login */}
            <p className='mt-4 text-center text-sm text-gray-600'>
              Already have an account?{' '}
              <button
                type='button'
                onClick={() => navigate('/login')}
                className='font-semibold text-green-900 hover:underline'
              >
                Log in
              </button>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmitOtp(handleVerifyOtp)}>
            <h2 className='mb-6 text-center text-2xl font-bold text-green-900'>
              Enter OTP
            </h2>
            <p className='mb-4 text-center text-sm text-gray-600'>
              Code sent to <span className='font-semibold'>{email}</span>
            </p>

            <div className='mb-4 flex flex-col'>
              <input
                type='text'
                placeholder='Enter 6-digit code'
                {...registerOtp('otp')}
                className={`rounded-md border p-2 focus:outline-none ${
                  otpErrors.otp ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isVerifying}
              />
              {otpErrors.otp && (
                <p className='mt-1 text-sm text-red-500'>
                  {otpErrors.otp.message}
                </p>
              )}
            </div>

            <div className='flex items-center justify-between gap-3'>
              {/* Back button */}
              <button
                type='button'
                onClick={() => {
                  resetOtp();
                  setStep(1);
                  setEmail('');
                }}
                disabled={isVerifying}
                className='w-1/3 rounded-md bg-gray-200 px-4 py-2 text-gray-700 shadow-sm hover:bg-gray-300 active:scale-95'
              >
                Back
              </button>
              {/* Verify button */}
              <button
                type='submit'
                disabled={isVerifying}
                className='flex flex-1 items-center justify-center gap-2 rounded-md bg-green-900 px-4 py-2 text-white shadow-md hover:bg-green-800 hover:shadow-lg active:scale-95 active:bg-green-950 active:shadow-inner disabled:cursor-not-allowed disabled:bg-gray-400'
              >
                {isVerifying && (
                  <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
                )}
                {isVerifying ? 'Verifying...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
