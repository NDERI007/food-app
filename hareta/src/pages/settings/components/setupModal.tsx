import { Shield, Key } from 'lucide-react';
import { QRCodeSetup } from './2fasetup';
import { RecoveryCodesModal } from './recoveryPanel';

interface TwoFactorSectionProps {
  twoFactorEnabled: boolean;
  showQRCode: boolean;
  qrCodeUrl: string;
  secret: string;
  verificationCode: string;
  showRecoveryCodes: boolean;
  recoveryCodes: string[];
  loading: boolean;
  onToggle: () => void;
  onVerificationCodeChange: (code: string) => void;
  onCancelSetup: () => void;
  onVerify: () => void;
  onCloseRecoveryCodes: () => void;
  onRegenerateCodes: () => void;
}

export function TwoFactorSection({
  twoFactorEnabled,
  showQRCode,
  qrCodeUrl,
  secret,
  verificationCode,
  showRecoveryCodes,
  recoveryCodes,
  loading,
  onToggle,
  onVerificationCodeChange,
  onCancelSetup,
  onVerify,
  onCloseRecoveryCodes,
  onRegenerateCodes,
}: TwoFactorSectionProps) {
  return (
    <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
      <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6'>
        <div className='flex-1'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <Shield className='h-4 w-4 text-green-600 sm:h-5 sm:w-5' />
            <h2 className='text-lg font-semibold text-gray-900 sm:text-xl'>
              Two-factor Authentication
            </h2>
          </div>
          <p className='mt-2 text-sm text-gray-600'>
            Add an additional layer of security by requiring at least two
            methods of authentication to sign in.
          </p>
        </div>

        <button
          onClick={onToggle}
          disabled={loading}
          className={`relative h-6 w-11 flex-shrink-0 self-start rounded-full transition-colors sm:ml-4 ${
            twoFactorEnabled ? 'bg-green-600' : 'bg-gray-300'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {showQRCode && (
        <QRCodeSetup
          qrCodeUrl={qrCodeUrl}
          secret={secret}
          verificationCode={verificationCode}
          loading={loading}
          onVerificationCodeChange={onVerificationCodeChange}
          onCancel={onCancelSetup}
          onVerify={onVerify}
        />
      )}

      {showRecoveryCodes && (
        <RecoveryCodesModal
          recoveryCodes={recoveryCodes}
          onClose={onCloseRecoveryCodes}
        />
      )}

      {twoFactorEnabled && (
        <div className='border-t border-gray-200'>
          <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <Key className='h-4 w-4 text-green-600' />
                <h3 className='font-medium text-gray-900'>Recovery Codes</h3>
              </div>
              <p className='mt-1 text-sm text-gray-600'>
                Security codes when you cannot access any of your other
                two-factor methods.
              </p>
            </div>
            <button
              onClick={onRegenerateCodes}
              disabled={loading}
              className='w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto'
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
