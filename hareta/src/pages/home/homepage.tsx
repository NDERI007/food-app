import Features from './components/feature';
import FeedbackButton from './components/feedback';
import Footer from './components/footer';
import Hero from './components/hero';
import Navbar from './components/navbar';

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Navbar />
      <FeedbackButton />
      <Footer />
    </>
  );
}
