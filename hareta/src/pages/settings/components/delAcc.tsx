import { ConfirmModal } from '@components/confirmModal';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountSectionProps {
  showDeleteConfirm: boolean;
  loading: boolean;
  onShowConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function DeleteAccountSection({
  showDeleteConfirm,
  loading,
  onShowConfirm,
  onCancel,
  onDelete,
}: DeleteAccountSectionProps) {
  return (
    <>
      <div className='rounded-lg border border-red-200 bg-red-50'>
        <div className='p-4 sm:p-6'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start'>
            <AlertTriangle className='h-5 w-5 flex-shrink-0 text-red-600' />
            <div className='flex-1'>
              <h2 className='text-lg font-semibold text-red-700 sm:text-xl'>
                Delete Account
              </h2>
              <p className='mt-2 text-sm text-red-600'>
                Permanently remove your Personal Account and all of its contents
                from the platform. This action is not reversible, so please
                continue with caution.
              </p>
            </div>
          </div>

          <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end'>
            <button
              onClick={onShowConfirm}
              disabled={loading}
              className='w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50 sm:w-auto'
            >
              Delete Personal Account
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={showDeleteConfirm}
        message='Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'
        onConfirm={onDelete}
        onCancel={onCancel}
        confirmText='Delete Account'
        cancelText='Cancel'
        loading={loading}
      />
    </>
  );
}
