import React from 'react';

interface EmojiRatingProps {
  value: number;
  onChange: (rating: number) => void;
  type?: 'overall' | 'quality' | 'delivery' | 'service';
}

const emojiSets: Record<string, string[]> = {
  overall: ['😭', '😞', '😐', '🙂', '😁'], // general mood
  delivery: ['🐢', '🚶', '🚴', '🚗', '🚀'], // delivery speed
  service: ['😐', '😕', '🙂', '😊', '🤗'], // customer service
};

const labels: Record<string, string[]> = {
  overall: ['Terrible', 'Poor', 'Average', 'Good', 'Excellent'],
  quality: ['Awful', 'Below Avg', 'Tasty', 'Delicious', 'Perfect'],
  delivery: ['Very Slow', 'Slow', 'Okay', 'Fast', 'Super Fast'],
  service: ['Rude', 'Unhelpful', 'Okay', 'Friendly', 'Amazing'],
};

const EmojiRating: React.FC<EmojiRatingProps> = ({
  value,
  onChange,
  type = 'overall',
}) => {
  const emojis = emojiSets[type] || emojiSets.overall;
  const emojiLabels = labels[type] || labels.overall;

  return (
    <div className='flex justify-center gap-3 text-3xl'>
      {emojis.map((emoji, index) => (
        <div key={index} className='flex flex-col items-center gap-1'>
          <button
            type='button'
            onClick={() => onChange(index + 1)}
            className={`rounded-lg p-2 transition-all duration-200 ${
              value === index + 1
                ? 'scale-95 bg-green-100 shadow-inner ring-2 ring-green-500 ring-inset'
                : 'hover:bg-gray-100 active:scale-95'
            }`}
          >
            {emoji}
          </button>
          <span
            className={`text-xs transition-colors ${
              value === index + 1
                ? 'font-medium text-green-600'
                : 'text-gray-500'
            }`}
          >
            {emojiLabels[index]}
          </span>
        </div>
      ))}
    </div>
  );
};

export default EmojiRating;
