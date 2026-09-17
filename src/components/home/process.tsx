import { Upload, Settings2, Printer, Truck } from 'lucide-react';

const steps = [
  { icon: Upload, step: '01', title: 'Upload Documents', desc: 'Drag & drop your PDF, DOCX, PPTX, or image files. We auto-detect page counts for you.' },
  { icon: Settings2, step: '02', title: 'Customize Options', desc: 'Choose color or B&W, paper type, binding, lamination, and more. See live pricing instantly.' },
  { icon: Printer, step: '03', title: 'We Print', desc: 'Our professional printers produce your documents with precision and quality.' },
  { icon: Truck, step: '04', title: 'Doorstep Delivery', desc: 'Track your order in real-time and receive WhatsApp updates until it reaches your door.' },
];

export function Process() {
  return (
    <section id="process" className="py-20">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">How It Works</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Print in four simple steps
          </h2>
          <p className="mt-3 text-muted-foreground">
            From upload to delivery, the entire process is designed to be effortless.
          </p>
        </div>
        <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          {steps.map((step, i) => (
            <div
              key={step.step}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-glow animate-fade-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                  <step.icon className="h-7 w-7" />
                </div>
                <span className="font-display text-3xl font-bold text-muted-foreground/20">{step.step}</span>
              </div>
              <h3 className="font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
