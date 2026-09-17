import {
  FileText, Image as ImageIcon, BookOpen, Layers, Palette, Package, GraduationCap, Briefcase,
} from 'lucide-react';

const services = [
  { icon: FileText, title: 'Document Printing', desc: 'Reports, resumes, forms, and official documents in B&W or color.' },
  { icon: ImageIcon, title: 'Photo Printing', desc: 'High-resolution photo prints on premium glossy or matte paper.' },
  { icon: BookOpen, title: 'Thesis & Project Binding', desc: 'Spiral, soft, or hard binding for theses, projects, and reports.' },
  { icon: Layers, title: 'Lamination', desc: 'Transparent lamination covers to protect and enhance your documents.' },
  { icon: Palette, title: 'Color Printing', desc: 'Vibrant color prints for presentations, posters, and portfolios.' },
  { icon: Package, title: 'Bulk Printing', desc: 'Large volume printing for offices, schools, and events at discounted rates.' },
  { icon: GraduationCap, title: 'Student Printing', desc: 'Special student pricing for assignments, notes, and study materials.' },
  { icon: Briefcase, title: 'Business Printing', desc: 'Pitch decks, brochures, invoices, and business documents with invoice included.' },
];

export function Services() {
  return (
    <section id="services" className="bg-muted/40 py-20">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Our Services</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Printing solutions for every need
          </h2>
          <p className="mt-3 text-muted-foreground">
            From a single page to bulk orders, we handle it all with precision and care.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => (
            <div
              key={service.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-glow animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-sky-500/10 text-primary transition-transform group-hover:scale-110">
                <service.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
