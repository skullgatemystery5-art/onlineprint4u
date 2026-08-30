import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { insertContactMessage } from '@/lib/database';

export function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }
    setSubmitting(true);
    try {
      await insertContactMessage({
        name: form.name, email: form.email, phone: form.phone, subject: form.subject, message: form.message,
      });
      toast.success('Message sent! We will get back to you shortly.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      toast.error('Failed to send message. Please try again or WhatsApp us.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="bg-muted/40 py-20">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Contact</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Get in touch with us
            </h2>
            <p className="mt-3 text-muted-foreground">
              Have a question about your order or need a custom quote? We are here to help.
              Reach out via the form, WhatsApp, email, or phone.
            </p>
            <div className="mt-8 space-y-4">
              <a href="https://wa.me/917858093865" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-glow">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">+91 7858093865 • Fastest response</p>
                </div>
              </a>
              <a href="mailto:contact@onlineprint4u.in" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-glow">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">Email</p>
                  <p className="text-sm text-muted-foreground">contact@onlineprint4u.in</p>
                </div>
              </a>
              <a href="tel:+917858093865" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-glow">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">Phone</p>
                  <p className="text-sm text-muted-foreground">+91 7858093865</p>
                </div>
              </a>
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">Address</p>
                  <p className="text-sm text-muted-foreground">Partliputra Colony, Near Ruban Hospital, Patna-800013</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 7858093865" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Order inquiry, bulk quote, etc." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help..." rows={5} required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
