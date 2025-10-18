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
  //{
  //title: 'Simple & convenient',
  //text: 'Browse the menu, customize your meal, and check out in just a few taps.',
  //img: '',
  //},
];

export default function Features() {
  return (
    <section className='mx-auto max-w-6xl px-6 py-16'>
      <div className='grid gap-8 md:grid-cols-3'>
        {features.map((f, i) => (
          <div
            key={i}
            className='overflow-hidden rounded-2xl bg-white shadow-md transition hover:shadow-lg'
          >
            <img
              src={f.img}
              alt={f.title}
              className='h-48 w-full object-cover'
            />
            <div className='p-6 text-center'>
              <h3 className='mb-2 text-xl font-semibold text-gray-800'>
                {f.title}
              </h3>
              <p className='text-gray-600'>{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
