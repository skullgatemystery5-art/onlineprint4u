import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Hero } from '@/components/home/hero';
import { WhyChooseUs } from '@/components/home/why-choose-us';
import { Services } from '@/components/home/services';
import { Process } from '@/components/home/process';
import { RateCard } from '@/components/home/rate-card';
import { UploadArea } from '@/components/home/upload-area';
import { Reviews } from '@/components/home/reviews';
import { FAQ } from '@/components/home/faq';
import { Contact } from '@/components/home/contact';
import { FloatingWidgets } from '@/components/floating-widgets';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <WhyChooseUs />
        <Services />
        <Process />
        <RateCard />
        <UploadArea />
        <Reviews />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <FloatingWidgets />
    </>
  );
}
