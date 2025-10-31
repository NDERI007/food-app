import { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

interface QRCodeSetupProps {
  qrCodeUrl: string;
  secret: string;
  verificationCode: string;
  loading: boolean;
  onVerificationCodeChange: (code: string) => void;
  onCancel: () => void;
  onVerify: () => void;
}

export function QRCodeSetup({
  qrCodeUrl,
  secret,
  verificationCode,
  loading,
  onVerificationCodeChange,
  onCancel,
  onVerify,
}: QRCodeSetupProps) {
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Sync digits with verificationCode prop
  useEffect(() => {
    if (verificationCode.length === 0) {
      setDigits(Array(6).fill(''));
    }
  }, [verificationCode]);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleChange = (value: string, index: number) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Update parent component
    onVerificationCodeChange(newDigits.join(''));

    // Auto-focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const pastedDigits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

    if (pastedDigits.length > 0) {
      const newDigits = [...digits];
      pastedDigits.forEach((digit, i) => {
        if (i < 6) newDigits[i] = digit;
      });
      setDigits(newDigits);
      onVerificationCodeChange(newDigits.join(''));

      // Focus the next empty input or the last one
      const nextEmptyIndex = newDigits.findIndex((d) => !d);
      const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div className='border-t border-gray-200 p-4 sm:p-6'>
      <div className='rounded-lg bg-blue-50 p-4'>
        <h3 className='mb-4 font-medium text-gray-900'>
          Set up Authenticator App
        </h3>

        <div className='mb-4 flex justify-center'>
          <img src={qrCodeUrl} alt='QR Code' className='h-48 w-48' />
        </div>

        <p className='mb-2 text-sm text-gray-600'>
          Scan this QR code with your authenticator app, or manually enter this
          code:
        </p>

        <div className='mb-4 flex items-center justify-center gap-2'>
          <code className='block rounded bg-gray-100 px-3 py-2 text-center text-sm'>
            {secret}
          </code>
          <button
            onClick={copySecret}
            className='rounded-lg border border-gray-300 bg-white p-2 text-gray-700 transition hover:bg-gray-50'
            title='Copy secret key'
          >
            {copiedSecret ? (
              <Check className='h-4 w-4 text-green-600' />
            ) : (
              <Copy className='h-4 w-4' />
            )}
          </button>
        </div>

        <div className='mt-6'>
          <label className='mb-3 block text-center text-sm font-medium text-gray-700'>
            Enter verification code
          </label>
          <div
            className='mb-4 flex justify-center gap-2 sm:gap-3'
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
                disabled={loading}
                className='h-10 w-10 rounded-lg border-2 border-gray-300 text-center text-lg font-semibold text-gray-900 focus:border-green-600 focus:outline-none disabled:bg-gray-100 sm:h-12 sm:w-12 sm:text-xl'
              />
            ))}
          </div>
        </div>

        <div className='mt-4 flex gap-2'>
          <button
            onClick={onCancel}
            disabled={loading}
            className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            onClick={onVerify}
            disabled={loading || verificationCode.length !== 6}
            className='flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50'
          >
            {loading ? 'Verifying...' : 'Verify & Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}
