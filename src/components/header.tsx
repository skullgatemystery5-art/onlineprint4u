import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Upload, ShoppingCart, LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/#why-us', label: 'Why Us' },
  { href: '/#services', label: 'Services' },
  { href: '/#process', label: 'Process' },
  { href: '/#rate-card', label: 'Rate Card' },
  { href: '/#reviews', label: 'Reviews' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/#contact', label: 'Contact' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const { items } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cartCount = items.length;

  const handleNavClick = (href: string) => {
    setOpen(false);
    if (href.startsWith('/#')) {
      const hash = href.slice(1);
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(href);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-border/60 bg-background/80 backdrop-blur-lg shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link to="/" className="shrink-0 cursor-pointer">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/cart">
            <Button size="sm" variant="ghost" className="relative gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          {user && (
            <div className="flex items-center gap-1">
              <Link to={isAdmin ? '/admin' : '/dashboard'}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  {isAdmin ? 'Admin' : 'Dashboard'}
                </Button>
              </Link>
              {!isAdmin && (
                <Link to="/profile">
                  <Button size="sm" variant="ghost" className="gap-1.5">
                    <UserCircle className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Link to="/print">
            <Button size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Upload & Print Now
            </Button>
          </Link>
        </div>

        <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-lg lg:hidden">
          <nav className="container mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link to="/print" onClick={() => setOpen(false)}>
                <Button className="w-full gap-1.5">
                  <Upload className="h-4 w-4" /> Upload & Print Now
                </Button>
              </Link>
              <Link to="/cart" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full gap-1.5">
                  <ShoppingCart className="h-4 w-4" /> Cart ({cartCount})
                </Button>
              </Link>
              {user && (
                <>
                  <Link to={isAdmin ? '/admin' : '/dashboard'} onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full gap-1.5">
                      <LayoutDashboard className="h-4 w-4" /> {isAdmin ? 'Admin Panel' : 'Dashboard'}
                    </Button>
                  </Link>
                  {!isAdmin && (
                    <Link to="/profile" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full gap-1.5">
                        <UserCircle className="h-4 w-4" /> My Profile
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full gap-1.5"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

    </header>
  );
}
