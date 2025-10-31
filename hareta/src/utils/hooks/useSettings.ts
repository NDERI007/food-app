import { AxiosError } from 'axios';
import { api } from '@utils/hooks/apiUtils';
import { useSettingsStore } from '@utils/hooks/2fastore';
import { useNavigate } from 'react-router-dom';

export function useSettingsActions() {
  const {
    setLoading,
    setError,
    setTwoFactorEnabled,
    setQrCodeUrl,
    setSecret,
    setShowQRCode,
    setRecoveryCodes,
    setShowRecoveryCodes,
    setShowDeleteConfirm,
    resetQRCodeSetup,
    resetError,
  } = useSettingsStore();

  const navigate = useNavigate();

  const handleToggleTwoFactor = async (currentlyEnabled: boolean) => {
    if (currentlyEnabled) {
      // Disable 2FA
      try {
        setLoading(true);
        await api.post('/api/mfa/disable', {}, { withCredentials: true });
        setTwoFactorEnabled(false);
        resetError();
      } catch (err) {
        const error = err as AxiosError<{ message: string }>;
        setError(error.response?.data?.message || 'Failed to disable 2FA');
      } finally {
        setLoading(false);
      }
    } else {
      // Enable 2FA - show QR code
      await handleSetupAuthenticator();
    }
  };

  const handleSetupAuthenticator = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        '/api/mfa/setup',
        {},
        { withCredentials: true },
      );

      setQrCodeUrl(response.data.qrCode);
      setSecret(response.data.secret);
      setShowQRCode(true);
      resetError();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(
        error.response?.data?.message || 'Failed to setup authenticator',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async (
    verificationCode: string,
    secret: string,
  ) => {
    try {
      setLoading(true);
      const response = await api.post(
        '/api/mfa/verify',
        { token: verificationCode, secret },
        { withCredentials: true },
      );

      setRecoveryCodes(response.data.recoveryCodes);
      setShowRecoveryCodes(true);
      setTwoFactorEnabled(true);
      resetQRCodeSetup();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        '/api/mfa/regenerate-codes',
        {},
        { withCredentials: true },
      );

      setRecoveryCodes(response.data.recoveryCodes);
      setShowRecoveryCodes(true);
      resetError();
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Failed to regenerate codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await api.delete('/api/profile/account', {
        withCredentials: true,
      });

      // Redirect to home or login page after successful deletion
      navigate('/');
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Failed to delete account');
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    handleToggleTwoFactor,
    handleVerifyAndEnable2FA,
    handleRegenerateRecoveryCodes,
    handleDeleteAccount,
  };
}
