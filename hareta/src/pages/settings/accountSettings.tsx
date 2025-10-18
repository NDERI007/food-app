import { useState } from 'react';
import { Shield, Key, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleTwoFactor = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    // TODO: Implement 2FA toggle logic
  };

  const handleAddAuthenticator = () => {
    // TODO: Implement authenticator setup
    alert('Authenticator setup coming soon!');
  };

  const handleRegenerateRecoveryCodes = () => {
    // TODO: Implement recovery codes regeneration
    alert('Recovery codes regenerated!');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    alert('Account deletion logic here');
  };

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

        <div className='space-y-6'>
          {/* Two-Factor Authentication Section */}
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

              {/* Toggle Switch */}
              <button
                onClick={handleToggleTwoFactor}
                className={`relative h-6 w-11 flex-shrink-0 self-start rounded-full transition-colors sm:ml-4 ${
                  twoFactorEnabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2FA Options */}
            <div className='border-t border-gray-200'>
              {/* Authenticator App */}
              <div className='flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
                <div className='flex-1'>
                  <h3 className='font-medium text-gray-900'>
                    Authenticator App (TOTP)
                  </h3>
                  <p className='mt-1 text-sm text-gray-600'>
                    Generate codes using an app like Google Authenticator or
                    Okta Verify.
                  </p>
                </div>
                <button
                  onClick={handleAddAuthenticator}
                  className='w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto'
                >
                  Add
                </button>
              </div>

              {/* Recovery Codes */}
              <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <Key className='h-4 w-4 text-green-600' />
                    <h3 className='font-medium text-gray-900'>
                      Recovery Codes
                    </h3>
                  </div>
                  <p className='mt-1 text-sm text-gray-600'>
                    Security codes when you cannot access any of your other
                    two-factor methods.
                  </p>
                </div>
                <button
                  onClick={handleRegenerateRecoveryCodes}
                  className='w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto'
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className='rounded-lg border border-red-200 bg-red-50'>
            <div className='p-4 sm:p-6'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start'>
                <AlertTriangle className='h-5 w-5 flex-shrink-0 text-red-600' />
                <div className='flex-1'>
                  <h2 className='text-lg font-semibold text-red-700 sm:text-xl'>
                    Delete Account
                  </h2>
                  <p className='mt-2 text-sm text-red-600'>
                    Permanently remove your Personal Account and all of its
                    contents from the platform. This action is not reversible,
                    so please continue with caution.
                  </p>
                </div>
              </div>

              <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end'>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className='w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 sm:w-auto'
                  >
                    Delete Personal Account
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className='w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className='w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 sm:w-auto'
                    >
                      Confirm Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
