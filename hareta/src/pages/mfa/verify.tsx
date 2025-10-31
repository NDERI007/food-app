import { useState, useRef } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@utils/hooks/apiUtils';
import { useAuth } from '@utils/hooks/useAuth';

export default function MfaVerify() {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Get email and user data from location state (passed from login page)
  const email = location.state?.email;
  const userData = location.state?.user;

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');

    if (pastedData.length === 6) {
      const newDigits = pastedData.split('');
      setDigits(newDigits);
      inputsRef.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = useBackup ? backupCode.trim() : digits.join('');

    if (useBackup && !code) {
      setError('Enter your backup code');
      return;
    }

    if (!useBackup && code.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await api.post(
        '/api/mfa/login-verify',
        {
          email,
          code,
          type: useBackup ? 'backup' : 'totp',
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        // Complete login with user data
        const user = response.data.user || userData;

        if (!user) {
          toast.error('Authentication failed. Please try again.');
          navigate('/login');
          return;
        }

        login(user.email, user.role);
        toast.success('Logged in successfully!');

        // Navigate based on role
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid or expired code');
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{
        error?: string;
        message?: string;
        attemptsRemaining?: number;
      }>;

      const errorData = error.response?.data;
      const errorMsg = errorData?.error || errorData?.message;

      if (errorData?.attemptsRemaining !== undefined) {
        setError(
          `Invalid code. ${errorData.attemptsRemaining} attempts remaining.`,
        );
      } else {
        setError(errorMsg || 'Failed to verify');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleBackup = () => {
    setError('');
    setUseBackup(!useBackup);
    setDigits(Array(6).fill(''));
    setBackupCode('');
  };

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-green-50 px-4 py-6'>
      <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-lg sm:p-8'>
        <h1 className='mb-2 text-center text-xl font-bold text-green-900 sm:text-2xl'>
          Two-Factor Authentication
        </h1>

        <p className='mb-6 text-center text-sm text-gray-600'>
          {useBackup
            ? 'Enter one of your backup recovery codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </p>

        {!useBackup ? (
          <div
            className='mb-6 flex justify-center gap-2 sm:gap-3'
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type='text'
                inputMode='numeric'
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                disabled={verifying}
                className='h-10 w-10 rounded-lg border-2 border-gray-300 text-center text-lg font-semibold text-gray-900 focus:border-green-600 focus:outline-none disabled:bg-gray-100 sm:h-12 sm:w-12 sm:text-xl'
              />
            ))}
          </div>
        ) : (
          <div className='mb-6'>
            <input
              type='text'
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder='Enter backup code'
              disabled={verifying}
              className='w-full rounded-lg border-2 border-gray-300 p-3 text-center text-base tracking-wider text-gray-900 focus:border-green-600 focus:outline-none disabled:bg-gray-100 sm:text-lg'
            />
          </div>
        )}

        {error && (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3'>
            <p className='text-center text-sm text-red-600'>{error}</p>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={verifying}
          className='w-full rounded-lg bg-green-900 px-4 py-3 font-semibold text-white shadow-md transition-all hover:bg-green-800 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-400'
        >
          {verifying ? (
            <span className='flex items-center justify-center gap-2'>
              <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
              Verifying...
            </span>
          ) : (
            'Verify'
          )}
        </button>

        <div className='mt-6 text-center'>
          <button
            onClick={handleToggleBackup}
            disabled={verifying}
            className='text-sm text-green-900 underline hover:text-green-700 disabled:text-gray-400'
          >
            {useBackup
              ? 'Use authenticator code instead'
              : 'Use backup code instead'}
          </button>
        </div>

        <div className='mt-4 text-center'>
          <button
            onClick={() => navigate('/login')}
            disabled={verifying}
            className='text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400'
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
