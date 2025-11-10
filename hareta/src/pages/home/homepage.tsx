import Features from './components/feature';
import FeedbackButton from './components/feedback';
import Footer from './components/footer';
import { HeroSection } from './components/heroo';
import Navbar from './components/navbar';

export default function Home() {
  return (
    <>
      <HeroSection />
      <Features />
      <Navbar />
      <FeedbackButton />
      <Footer />
    </>
  );
}
