import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface RecoveryCodesModalProps {
  recoveryCodes: string[];
  onClose: () => void;
}

export function RecoveryCodesModal({
  recoveryCodes,
  onClose,
}: RecoveryCodesModalProps) {
  const [copiedCodes, setCopiedCodes] = useState(false);

  const copyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className='border-t border-gray-200 p-4 sm:p-6'>
      <div className='rounded-lg bg-yellow-50 p-4'>
        <h3 className='mb-2 font-medium text-gray-900'>
          Save Your Recovery Codes
        </h3>
        <p className='mb-4 text-sm text-gray-600'>
          Store these codes in a safe place. Each code can only be used once.
        </p>

        <div className='mb-4 rounded bg-white p-4'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm font-medium text-gray-700'>
              Recovery Codes
            </span>
            <button
              onClick={copyAllCodes}
              className='flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-50'
            >
              {copiedCodes ? (
                <>
                  <Check className='h-3 w-3 text-green-600' />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className='h-3 w-3' />
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            {recoveryCodes.map((code, index) => (
              <code key={index} className='text-sm'>
                {code}
              </code>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className='w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700'
        >
          I've Saved My Codes
        </button>
      </div>
    </div>
  );
}
