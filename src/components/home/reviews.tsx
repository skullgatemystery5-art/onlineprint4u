import { useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { getActiveReviews, isSupabaseConfigured, type Review } from '@/lib/database';
import { cn } from '@/lib/utils';

const fallbackReviews: Review[] = [
  { id: '1', name: 'Aditya Sharma', role: 'Student, Delhi University', rating: 5, message: 'I uploaded my thesis at midnight and got it printed and delivered in 2 days. The spiral binding was perfect and the color pages were crisp. Online Print 4U saved my submission deadline!', avatar_color: 'primary', active: true, created_at: '' },
  { id: '2', name: 'Priya Nair', role: 'Architect, Bangalore', rating: 5, message: 'The A3 color prints for my portfolio came out beautifully. The live price calculator helped me stay within budget. Highly recommend for professionals who need quality prints fast.', avatar_color: 'emerald', active: true, created_at: '' },
  { id: '3', name: 'Rohan Mehta', role: 'Startup Founder, Mumbai', rating: 5, message: 'We use Online Print 4U for all our investor pitch deck printing. The hard binding option gives a premium feel and the courier tracking keeps us informed every step.', avatar_color: 'sky', active: true, created_at: '' },
  { id: '4', name: 'Sneha Reddy', role: 'Research Scholar, Hyderabad', rating: 5, message: 'Printed 300 pages of research papers in color. The auto page count feature is brilliant — no more manual counting. Delivered to my hostel without any hassle.', avatar_color: 'amber', active: true, created_at: '' },
  { id: '5', name: 'Karthik Iyer', role: 'CA Student, Chennai', rating: 4, message: 'Great service for exam printouts. The double-side printing saved me money and paper. Would love to see more pickup points in the future.', avatar_color: 'primary', active: true, created_at: '' },
  { id: '6', name: 'Ananya Das', role: 'Marketing Manager, Kolkata', rating: 5, message: 'The transparent lamination on my presentation covers looked so professional. The whole process from upload to delivery was seamless. My go-to printing service now.', avatar_color: 'emerald', active: true, created_at: '' },
];

const colorMap: Record<string, string> = {
  primary: 'bg-primary',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
};

export function Reviews() {
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getActiveReviews().then((data) => {
      if (data.length > 0) setReviews(data);
    });
  }, []);

  return (
    <section id="reviews" className="py-20">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Customer Reviews</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by thousands across India
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              4.8/5 from 12,000+ customers
            </span>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <div
              key={review.id}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-glow animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <Quote className="absolute right-5 top-5 h-8 w-8 text-primary/10" />
              <div className="flex items-center gap-3">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white', colorMap[review.avatar_color] ?? 'bg-primary')}>
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.role}</p>
                </div>
              </div>
              <div className="mt-3 flex">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className={cn('h-4 w-4', s < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{review.message}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
