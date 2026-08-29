import { cn } from '@/lib/utils';

export function Logo({
  className,
  size = 'default',
}: {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const dims = {
    sm: { box: 'h-8 w-8', icon: 16, text: 'text-base' },
    default: { box: 'h-10 w-10', icon: 20, text: 'text-lg' },
    lg: { box: 'h-14 w-14', icon: 28, text: 'text-2xl' },
  }[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-600 shadow-glow',
          dims.box
        )}
      >
        <svg
          width={dims.icon}
          height={dims.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" rx="1" />
          <circle cx="18" cy="11.5" r="0.5" fill="white" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn('font-display font-bold tracking-tight text-foreground', dims.text)}>
          Online Print <span className="text-primary">4U</span>
        </span>
        {size !== 'sm' && (
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Fast • Easy • Reliable
          </span>
        )}
      </div>
    </div>
  );
}
