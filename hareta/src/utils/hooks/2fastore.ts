import { create } from 'zustand';

interface SettingsState {
  // 2FA states
  twoFactorEnabled: boolean;
  showQRCode: boolean;
  qrCodeUrl: string;
  secret: string;
  verificationCode: string;
  recoveryCodes: string[];
  showRecoveryCodes: boolean;

  // UI states
  showDeleteConfirm: boolean;
  loading: boolean;
  error: string;
  copiedSecret: boolean;
  copiedCodes: boolean;

  // Actions
  setTwoFactorEnabled: (enabled: boolean) => void;
  setShowQRCode: (show: boolean) => void;
  setQrCodeUrl: (url: string) => void;
  setSecret: (secret: string) => void;
  setVerificationCode: (code: string) => void;
  setRecoveryCodes: (codes: string[]) => void;
  setShowRecoveryCodes: (show: boolean) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setCopiedSecret: (copied: boolean) => void;
  setCopiedCodes: (copied: boolean) => void;

  // Composite actions
  resetQRCodeSetup: () => void;
  resetError: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // Initial state
  twoFactorEnabled: false,
  showQRCode: false,
  qrCodeUrl: '',
  secret: '',
  verificationCode: '',
  recoveryCodes: [],
  showRecoveryCodes: false,
  showDeleteConfirm: false,
  loading: false,
  error: '',
  copiedSecret: false,
  copiedCodes: false,

  // Individual setters
  setTwoFactorEnabled: (enabled) => set({ twoFactorEnabled: enabled }),
  setShowQRCode: (show) => set({ showQRCode: show }),
  setQrCodeUrl: (url) => set({ qrCodeUrl: url }),
  setSecret: (secret) => set({ secret }),
  setVerificationCode: (code) => set({ verificationCode: code }),
  setRecoveryCodes: (codes) => set({ recoveryCodes: codes }),
  setShowRecoveryCodes: (show) => set({ showRecoveryCodes: show }),
  setShowDeleteConfirm: (show) => set({ showDeleteConfirm: show }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCopiedSecret: (copied) => set({ copiedSecret: copied }),
  setCopiedCodes: (copied) => set({ copiedCodes: copied }),

  // Composite actions for common operations
  resetQRCodeSetup: () =>
    set({
      showQRCode: false,
      verificationCode: '',
      error: '',
    }),
  resetError: () => set({ error: '' }),
}));
