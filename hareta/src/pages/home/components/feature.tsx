import deliveryImg from '@assets/feature-delivery.avif';
import veggieImg from '@assets/feature-fresh.avif';

const features = [
  {
    title: 'Fresh food, fast',
    text: 'Order in minutes and get your meal hot and ready, delivered to your door or available for pickup.',
    img: deliveryImg,
  },
  {
    title: 'Made with care',
    text: 'Our meals are cooked daily with fresh, locally sourced ingredients.',
    img: veggieImg,
  },
];

export default function Features() {
  return (
    /* THIS IS THE KEY: The entire section background is 'bg-white'.
      This creates a high-contrast break from the cream hero and the dark green footer.
    */
    <section className='w-full bg-white py-16'>
      {/* We use the same max-width container as the hero to keep alignment */}
      <div className='mx-auto grid max-w-4xl gap-12 px-6 md:grid-cols-2'>
        {features.map((f, i) => (
          /*
            This 'div' is now just a layout container.
            No card styles, no background, no shadow.
            Just the image and text on the white section background.
          */
          <div key={i} className='flex flex-col text-left'>
            <img
              src={f.img}
              alt={f.title}
              className='h-64 w-full rounded-lg object-cover'
            />
            <div className='pt-4'>
              <h3 className='mb-2 text-xl font-semibold text-green-900'>
                {f.title}
              </h3>
              {/* Using your dark green with 80% opacity for the body text */}
              <p className='text-green-900/80'>{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
