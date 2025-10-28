import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

type ConfirmModalProps = {
  show: boolean;
  message: string;
  onConfirm: () => Promise<void> | void; // supports async
  onCancel: () => void;
};

export function ConfirmModal({
  show,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className='w-full max-w-sm rounded-xl bg-gray-900 p-5 shadow-2xl ring-1 ring-purple-800/40'
          >
            <p className='mb-4 text-base font-medium text-gray-100'>
              {message}
            </p>

            <div className='flex justify-end gap-3'>
              <button
                onClick={onCancel}
                disabled={loading}
                className='rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className='flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {loading ? (
                  <>
                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white'></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
