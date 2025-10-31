import { useSettingsStore } from '@utils/hooks/2fastore';
import { DeleteAccountSection } from './components/delAcc';
import { ErrorAlert } from './components/error';
import { TwoFactorSection } from './components/setupModal';
import { useSettingsActions } from '@utils/hooks/useSettings';

export default function SettingsPage() {
  const {
    twoFactorEnabled,
    showDeleteConfirm,
    showQRCode,
    qrCodeUrl,
    secret,
    verificationCode,
    recoveryCodes,
    showRecoveryCodes,
    loading,
    error,
    setVerificationCode,
    setShowRecoveryCodes,
    setShowDeleteConfirm,
    resetQRCodeSetup,
  } = useSettingsStore();

  const {
    handleToggleTwoFactor,
    handleVerifyAndEnable2FA,
    handleRegenerateRecoveryCodes,
    handleDeleteAccount,
  } = useSettingsActions();

  return (
    <div className='min-h-screen bg-[#fefaef]'>
      <div className='mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Settings</h1>
          <p className='mt-2 text-sm text-gray-600'>
            Manage your account security and preferences
          </p>
        </div>

        <ErrorAlert error={error} />

        <div className='space-y-6'>
          <TwoFactorSection
            twoFactorEnabled={twoFactorEnabled}
            showQRCode={showQRCode}
            qrCodeUrl={qrCodeUrl}
            secret={secret}
            verificationCode={verificationCode}
            showRecoveryCodes={showRecoveryCodes}
            recoveryCodes={recoveryCodes}
            loading={loading}
            onToggle={() => handleToggleTwoFactor(twoFactorEnabled)}
            onVerificationCodeChange={setVerificationCode}
            onCancelSetup={resetQRCodeSetup}
            onVerify={() => handleVerifyAndEnable2FA(verificationCode, secret)}
            onCloseRecoveryCodes={() => setShowRecoveryCodes(false)}
            onRegenerateCodes={handleRegenerateRecoveryCodes}
          />

          <DeleteAccountSection
            showDeleteConfirm={showDeleteConfirm}
            loading={loading}
            onShowConfirm={() => setShowDeleteConfirm(true)}
            onCancel={() => setShowDeleteConfirm(false)}
            onDelete={handleDeleteAccount}
          />
        </div>
      </div>
    </div>
  );
}
