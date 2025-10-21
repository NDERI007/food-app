import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import EmojiRating from '@components/emojiRating';
import { toast } from 'sonner';
import axios from 'axios';

interface SurveyData {
  overallRating: number;
  improvements: string;
  additionalComments: string;
}

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData>({
    overallRating: 0,
    improvements: '',
    additionalComments: '',
  });

  const handleRatingClick = (rating: number) => {
    setSurveyData((prev) => ({ ...prev, overallRating: rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!surveyData.overallRating || !surveyData.improvements.trim()) {
      toast.warning('Please complete all required fields before submitting.');
      return;
    }

    const submitFeedback = async () => {
      try {
        setSubmitted(true);

        const { overallRating, improvements, additionalComments } = surveyData;

        const response = await axios.post('/api/feedback/insert', {
          overall_rating: overallRating,
          improvements,
          additional_comments: additionalComments,
        });

        if (response.data?.success) {
          toast.success('Thank you for your feedback!');
          setSubmitted(true);

          setTimeout(() => {
            setIsOpen(false);
            setSubmitted(false);
            setSurveyData({
              overallRating: 0,
              improvements: '',
              additionalComments: '',
            });
          }, 2000);
        } else {
          toast.error(
            response.data?.message || 'Something went wrong. Try again.',
          );
        }
      } catch (error: unknown) {
        console.error('Error submitting feedback:', error);

        if (axios.isAxiosError(error)) {
          if (error.response) {
            // 4xx or 5xx error from server
            const msg =
              error.response.data?.message ||
              `Server error (${error.response.status})`;
            toast.error(msg);
          } else if (error.request) {
            // Network or timeout error
            toast.error('Network error. Please check your connection.', {
              action: {
                label: 'Retry',
                onClick: () => {
                  toast.dismiss(); // remove the previous toast
                  submitFeedback(); // reattempt submission
                },
              },
            });
          } else {
            toast.error('Unexpected setup error. Please try again.');
          }
        } else {
          toast.error('An unknown error occurred.');
        }
      } finally {
        setSubmitted(false);
      }
    };

    await submitFeedback();
  };

  return (
    <>
      {/* Floating Feedback Button */}
      <div className='group fixed right-6 bottom-6 z-50'>
        <button
          onClick={() => setIsOpen(true)}
          className='rounded-full bg-green-600 p-3 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-green-700 focus:outline-none'
        >
          <MessageCircle size={22} />
        </button>
        <div className='absolute top-1/2 right-16 -translate-y-1/2 rounded-md bg-gray-800 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
          Share your experience!
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'>
          <div className='relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl'>
            <button
              onClick={() => setIsOpen(false)}
              className='absolute top-4 right-4 text-gray-500 hover:text-gray-800'
            >
              ✕
            </button>

            {!submitted ? (
              <>
                <h2 className='mb-2 text-2xl font-semibold text-gray-800'>
                  How was your experience?
                </h2>
                <p className='mb-6 text-sm text-gray-600'>
                  We'd love to know how you feel about IuraFoods!
                </p>

                <form onSubmit={handleSubmit} className='space-y-6'>
                  {/* Overall Experience Rating */}
                  <div className='text-center'>
                    <label className='mb-3 block text-sm font-medium text-gray-700'>
                      Overall, how would you rate IuraFoods?
                      <span className='text-red-500'>*</span>
                    </label>
                    <EmojiRating
                      value={surveyData.overallRating}
                      onChange={handleRatingClick}
                      type='overall'
                    />
                  </div>

                  {/* Improvements */}
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      What could we improve?
                      <span className='text-red-500'>*</span>
                    </label>
                    <textarea
                      value={surveyData.improvements}
                      onChange={(e) =>
                        setSurveyData((prev) => ({
                          ...prev,
                          improvements: e.target.value,
                        }))
                      }
                      placeholder='e.g., Faster delivery, better app design, more menu options...'
                      className='h-24 w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none'
                      required
                    />
                  </div>

                  {/* Additional Comments */}
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      Any other thoughts? (Optional)
                    </label>
                    <textarea
                      value={surveyData.additionalComments}
                      onChange={(e) =>
                        setSurveyData((prev) => ({
                          ...prev,
                          additionalComments: e.target.value,
                        }))
                      }
                      placeholder='Share anything else on your mind...'
                      className='h-20 w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none'
                    />
                  </div>

                  <button
                    type='submit'
                    disabled={
                      submitted ||
                      surveyData.overallRating === 0 ||
                      !surveyData.improvements.trim()
                    }
                    className='w-full rounded-lg bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300'
                  >
                    Submit Feedback
                  </button>
                </form>
              </>
            ) : (
              <div className='py-12 text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                  <svg
                    className='h-8 w-8 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <h3 className='mb-2 text-xl font-semibold text-gray-800'>
                  Thank you for your feedback!
                </h3>
                <p className='text-sm text-gray-600'>
                  Your thoughts help us make IuraFoods even better.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
