import { Link } from 'react-router-dom';
import { XCircle, RefreshCw, Mail } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';

export default function OrderFailedPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[80vh] items-center justify-center bg-muted/30 px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm animate-scale-in">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="font-display text-2xl font-bold">Payment Failed</h1>
            <p className="mt-2 text-muted-foreground">
              We could not process your payment. This can happen due to network issues or
              insufficient funds. No money has been deducted.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/cart" className="flex-1">
                <Button className="w-full gap-2">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
              </Link>
              <Link to="/#contact" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Mail className="h-4 w-4" /> Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
