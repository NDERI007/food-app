import { motion, AnimatePresence } from 'framer-motion';

type ConfirmModalProps = {
  show: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  show,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
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
            className='w-full max-w-sm rounded-xl bg-[#FEFAEF] p-5 shadow-xl ring-1 ring-green-900/30'
          >
            <p className='mb-4 text-base font-medium text-green-900'>
              {message}
            </p>

            <div className='flex justify-end gap-3'>
              <button
                onClick={onCancel}
                className='rounded-md border border-green-900/40 bg-transparent px-4 py-2 text-sm font-medium text-green-900 transition-colors hover:bg-green-900/10'
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className='rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-[#FEFAEF] transition-colors hover:bg-green-800'
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
