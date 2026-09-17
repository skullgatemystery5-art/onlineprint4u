import { Link } from 'react-router-dom';
import { Home, FileText } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center bg-muted/30 px-4 py-16">
        <div className="w-full max-w-md text-center">
          <p className="font-display text-8xl font-bold text-primary/20">404</p>
          <h1 className="mt-2 font-display text-2xl font-bold">Page Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/">
              <Button className="w-full gap-2">
                <Home className="h-4 w-4" /> Go Home
              </Button>
            </Link>
            <Link to="/print">
              <Button variant="outline" className="w-full gap-2">
                <FileText className="h-4 w-4" /> Upload &amp; Print
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
