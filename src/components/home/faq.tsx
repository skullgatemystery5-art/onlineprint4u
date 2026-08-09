import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  { q: 'What file formats do you support?', a: 'We support PDF, DOCX, PPTX, JPG, and PNG files. You can upload multiple files at once, and our system automatically counts the pages for accurate pricing.' },
  { q: 'How long does delivery take?', a: 'We offer Local Delivery in Patna only, with a delivery time of 1-2 days and a flat fee of ₹69.00.' },
  { q: 'How is the price calculated?', a: 'Our live price engine calculates the cost based on print type (B&W or color), paper type (GSM), single or double side, number of copies, binding, lamination, and shipping. You can apply coupon codes for additional discounts.' },
  { q: 'Is my data secure?', a: 'Absolutely. Your files are encrypted during upload and storage. After printing is complete, files are automatically deleted from our servers. We never share your data with third parties.' },
  { q: 'What payment methods do you accept?', a: 'We accept Razorpay for online payments (cards, UPI, net banking, wallets) and Cash on Delivery (COD) for select pin codes. You will receive an invoice after payment.' },
  { q: 'Can I track my order?', a: 'Yes! You will receive WhatsApp and email updates at every stage — order placed, processing, printing complete, shipped, and delivered. You can also track your order from your dashboard using your order number.' },
  { q: 'Do you offer bulk discounts?', a: 'Yes, we offer discounted rates for bulk orders. Use coupon PRINT10 for 10% off orders above ₹500, or contact us for custom bulk pricing on large volume orders.' },
  { q: 'What is your refund policy?', a: 'If there is a printing error or quality issue on our end, we will reprint or refund your order. Since printing is a custom service, we do not offer refunds for change of mind after printing has begun.' },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto max-w-3xl px-4 lg:px-8">
        <div className="mb-12 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">FAQ</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to know about printing with Online Print 4U.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-display text-base font-semibold">{faq.q}</span>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open === i && 'rotate-180')} />
              </button>
              <div className={cn('grid transition-all duration-300', open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
