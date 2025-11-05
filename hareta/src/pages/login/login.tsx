import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import {
  emailSchema,
  otpSchema,
  type emailSchemaType,
  type OtpSchemaType,
} from '@utils/schemas/auth';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@utils/hooks/useAuth';
import { api } from '@utils/hooks/apiUtils';

export default function Login() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const sendingRef = useRef(false); // local guard to prevent re-entry
  const cooldownTimeoutRef = useRef<number | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Step 1 form (email)
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: formIsSubmitting },
    reset: resetEmail,
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
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      await api.post(
        '/api/auth/send-otp',
        { email: data.email },
        { withCredentials: true },
      );

      toast.success('OTP sent! Check your inbox.');
      setEmail(data.email);
      setStep(2);

      resetEmail();

      cooldownTimeoutRef.current = window.setTimeout(() => {
        setDisabled(false);
        sendingRef.current = false; // allow future sends after cooldown
        cooldownTimeoutRef.current = null;
      }, 30_000);
    } catch (err: unknown) {
      setDisabled(false);
      sendingRef.current = false;
      if (axios.isAxiosError(err)) {
        const backendMsg = (err.response?.data as { error?: string })?.error;
        toast.error(backendMsg || 'Failed to send OTP');
      } else {
        toast.error('Unexpected error occurred');
      }
    }
  };
  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
    };
  }, []);

  const handleVerifyOtp = async (data: OtpSchemaType) => {
    setIsVerifying(true);
    try {
      // 1️⃣ Verify OTP with backend
      const response = await api.post(
        '/api/auth/verify-otp',
        { email, code: data.otp },
        { withCredentials: true },
      );

      // 2️⃣ Extract user from response
      const { user: serverUser } = response.data;

      if (!serverUser) {
        setIsVerifying(false);
        toast.error('Authentication failed. Please try again.');
        return;
      }

      if (serverUser.two_factor_enabled) {
        // Navigate to MFA verification page
        navigate('/mfa-verify', {
          state: {
            email: serverUser.email,
            user: serverUser,
          },
        });
        return;
      }

      // 4️⃣ If no MFA required, complete login immediately
      login(serverUser.email, serverUser.role);

      toast.success('Logged in successfully!');

      // 5️⃣ Navigate based on role
      if (serverUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setIsVerifying(false);

      const error = err as AxiosError<{
        error?: string;
        code?: string;
        attemptsRemaining?: number;
      }>;

      const errorData = error.response?.data;
      const backendMsg = errorData?.error;
      const errorCode = errorData?.code;

      // Better error handling with error codes
      if (errorCode === 'OTP_NOT_FOUND') {
        toast.error('OTP expired. Please request a new one.');
      } else if (errorCode === 'TOO_MANY_ATTEMPTS') {
        toast.error('Too many failed attempts. Please request a new OTP.');
      } else if (errorCode === 'INVALID_OTP' && errorData?.attemptsRemaining) {
        toast.error(
          `Invalid OTP. ${errorData.attemptsRemaining} attempts remaining.`,
        );
      } else {
        toast.error(backendMsg || 'Failed to verify OTP');
      }
    }
  };

  // Render
  return (
    <div className='flex min-h-screen items-center justify-center bg-green-50'>
      <div className='w-full max-w-md rounded-xl bg-white p-8 shadow-lg'>
        {step === 1 && (
          <form onSubmit={handleSubmitEmail(handleSendOtp)}>
            <h2 className='mb-6 text-center text-2xl font-bold text-green-900'>
              What's your email?
            </h2>

            <div className='mb-4 flex flex-col'>
              <input
                type='email'
                placeholder='Enter your email'
                {...registerEmail('email')}
                className={`rounded-md border p-2 focus:outline-none ${
                  emailErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {emailErrors.email && (
                <p className='mt-1 text-sm text-red-500'>
                  {emailErrors.email.message}
                </p>
              )}
            </div>

            <button
              type='submit'
              disabled={disabled || formIsSubmitting}
              className='w-full rounded-md bg-green-900 px-4 py-2 text-white shadow-md transition-all duration-150 hover:bg-green-800 hover:shadow-lg active:scale-95 active:bg-green-950 active:shadow-inner disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none disabled:active:scale-100'
            >
              {disabled ? 'Please wait...' : 'Continue'}
            </button>

            <p className='mt-6 text-center text-sm text-gray-600'>
              Don't have an account?{' '}
              <Link
                to={'/signup'}
                className='font-semibold text-green-900 hover:underline'
              >
                Sign up
              </Link>
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
                className='active:scale-95disabled:cursor-not-allowed w-1/3 rounded-md bg-gray-200 px-4 py-2 text-gray-700 shadow-sm hover:bg-gray-300 disabled:bg-gray-400 disabled:shadow-none disabled:active:scale-100'
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
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
