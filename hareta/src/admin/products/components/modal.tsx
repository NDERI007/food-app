import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  // Close modal with ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className='fixed inset-0 z-50 flex items-center justify-center bg-[rgba(245,241,230,0.75)] backdrop-blur-sm'
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className='relative w-full max-w-md rounded-2xl border border-[#d4dac9] bg-[#fdfcf9] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
          >
            {title && (
              <div className='mb-4 flex items-center justify-between border-b border-[#e3e8dc] pb-2'>
                <h2 className='text-lg font-semibold text-[#1b4d2b]'>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className='rounded-full p-1.5 transition hover:bg-[#e9ede5]'
                >
                  <X size={18} className='text-[#1b4d2b]' />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
