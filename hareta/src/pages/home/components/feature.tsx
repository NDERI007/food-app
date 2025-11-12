import deliveryImg from '@assets/feature-delivery.avif';
import veggieImg from '@assets/feature-fresh.avif';
import cartImg from '@assets/feature-cart.avif'; // Update with your actual filename

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
  {
    title: 'Easy ordering, anytime',
    text: 'Browse our menu, customize your order, and track delivery—all from your phone in just a few taps.',
    img: cartImg,
  },
];

export default function Features() {
  return (
    <section className='w-full bg-white py-16'>
      {/* Updated to md:grid-cols-3 for three columns on desktop */}
      <div className='mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 lg:grid-cols-3'>
        {features.map((f, i) => (
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
              <p className='text-green-900/80'>{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
