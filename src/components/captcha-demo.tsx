import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  RefreshCw,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

// ============================================================
// Shared helpers
// ============================================================

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomString(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

function randomDigits(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

// ============================================================
// Facebook-style CAPTCHA — canvas-rendered distorted text
// ============================================================

const FB_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FB_LEN = 6;

type CharRender = {
  char: string;
  rotation: number;
  yOffset: number;
  fontSize: number;
  color: string;
  skew: number;
};

function generateCharRenders(text: string): CharRender[] {
  const colors = ['#1e40af', '#0f766e', '#9a3412', '#581c87', '#b91c1c', '#1e293b'];
  return text.split('').map((char) => ({
    char,
    rotation: (Math.random() - 0.5) * 0.7,
    yOffset: (Math.random() - 0.5) * 14,
    fontSize: 30 + Math.floor(Math.random() * 12),
    color: colors[Math.floor(Math.random() * colors.length)],
    skew: (Math.random() - 0.5) * 0.35,
  }));
}

function drawNoiseLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number
) {
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.strokeStyle = `hsl(${Math.random() * 360}, 60%, 55%, 0.18)`;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.stroke();
  }
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number
) {
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%, 0.25)`;
    ctx.fill();
  }
}

function FacebookCaptcha() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [target, setTarget] = useState(() => randomString(FB_LEN));
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const render = useCallback((text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#f0f4ff');
    grad.addColorStop(0.5, '#e8f0fe');
    grad.addColorStop(1, '#f5f0ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Noise lines behind text
    drawNoiseLines(ctx, w, h, 8);

    const renders = generateCharRenders(text);
    const slotWidth = w / (text.length + 0.5);
    const startX = slotWidth * 0.35;

    renders.forEach((r, i) => {
      ctx.save();
      const x = startX + i * slotWidth;
      const y = h / 2 + r.yOffset;
      ctx.translate(x, y);
      ctx.rotate(r.rotation);
      ctx.transform(1, 0, r.skew, 1, 0, 0);
      ctx.font = `bold ${r.fontSize}px Georgia, "Times New Roman", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Shadow for depth
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillText(r.char, 1.5, 1.5);

      // Main character
      ctx.fillStyle = r.color;
      ctx.fillText(r.char, 0, 0);

      // Outline
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.5;
      ctx.strokeText(r.char, 0, 0);

      ctx.restore();
    });

    // Noise lines in front of text
    drawNoiseLines(ctx, w, h, 5);
    drawDots(ctx, w, h, 30);
  }, []);

  useEffect(() => {
    render(target);
  }, [target, render]);

  const regenerate = () => {
    setTarget(randomString(FB_LEN));
    setInput('');
    setStatus('idle');
  };

  const speak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!('speechSynthesis' in window)) {
      toast.error('Audio CAPTCHA is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const spaced = target.split('').join(' ');
    const u = new SpeechSynthesisUtterance(spaced);
    u.rate = 0.55;
    u.pitch = 1;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    utteranceRef.current = u;
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const verify = () => {
    if (!input.trim()) {
      toast.error('Please enter the CAPTCHA text.');
      return;
    }
    if (input.toUpperCase().trim() === target) {
      setStatus('success');
      toast.success('Facebook CAPTCHA verified successfully!');
    } else {
      setStatus('error');
      toast.error('Incorrect CAPTCHA. Try again.');
      setTarget(randomString(FB_LEN));
      setInput('');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877f2]/10">
          <ShieldCheck className="h-5 w-5 text-[#1877f2]" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">Facebook-Style CAPTCHA</h3>
          <p className="text-sm text-muted-foreground">
            Distorted text with noise — type what you see.
          </p>
        </div>
      </div>

      {/* Canvas + controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={300}
            height={80}
            className="rounded-lg border-2 border-border bg-[#e8f0fe] select-none"
            aria-label="CAPTCHA image with distorted text"
          />
          <button
            onClick={regenerate}
            className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-95"
            title="Reload CAPTCHA"
            aria-label="Reload CAPTCHA"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={speak}
            className={cn(
              'gap-2 border-border',
              isSpeaking && 'border-[#1877f2] text-[#1877f2]'
            )}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4" />
                Stop Audio
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                Audio CAPTCHA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Input + verify */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (status !== 'idle') setStatus('idle');
            }}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            placeholder="Enter the text above"
            maxLength={FB_LEN}
            className={cn(
              'pr-10 text-base tracking-wider',
              status === 'success' && 'border-green-500 ring-1 ring-green-500',
              status === 'error' && 'border-red-500 ring-1 ring-red-500'
            )}
          />
          {status === 'success' && (
            <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
          )}
        </div>
        <Button onClick={verify} className="gap-2 bg-[#1877f2] hover:bg-[#0f6de2]">
          <ShieldCheck className="h-4 w-4" />
          Verify
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Characters are case-insensitive. Click the refresh icon for a new code.
      </p>
    </div>
  );
}

// ============================================================
// Flipkart-style CAPTCHA — clean numeric code
// ============================================================

const FK_LEN = 6;

function FlipkartCaptcha() {
  const [target, setTarget] = useState(() => randomDigits(FK_LEN));
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCode, setShowCode] = useState(true);

  const regenerate = () => {
    setTarget(randomDigits(FK_LEN));
    setInput('');
    setStatus('idle');
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Audio CAPTCHA is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const spaced = target.split('').join(' ');
    const u = new SpeechSynthesisUtterance(spaced);
    u.rate = 0.6;
    window.speechSynthesis.speak(u);
  };

  const verify = () => {
    if (!input.trim()) {
      toast.error('Please enter the numeric code.');
      return;
    }
    if (input.trim() === target) {
      setStatus('success');
      toast.success('Flipkart CAPTCHA verified successfully!');
    } else {
      setStatus('error');
      toast.error('Incorrect code. A new code has been generated.');
      setTarget(randomDigits(FK_LEN));
      setInput('');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2874f0]/10">
          <ShieldCheck className="h-5 w-5 text-[#2874f0]" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">Flipkart-Style CAPTCHA</h3>
          <p className="text-sm text-muted-foreground">
            Clean {FK_LEN}-digit numeric code — type the numbers.
          </p>
        </div>
      </div>

      {/* Code display */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex items-center gap-1 rounded-xl border-2 border-border bg-gradient-to-br from-blue-50 to-indigo-50 px-5 py-4 select-none">
          {target.split('').map((d, i) => (
            <span
              key={i}
              className={cn(
                'flex h-12 w-9 items-center justify-center rounded-md text-2xl font-bold tabular-nums',
                'bg-white/70 shadow-sm',
                showCode ? 'text-[#2874f0]' : 'text-transparent'
              )}
              style={{
                transform: `rotate(${(Math.random() - 0.5) * 6}deg)`,
                fontFamily: 'monospace',
              }}
            >
              {showCode ? d : '•'}
            </span>
          ))}
          <button
            onClick={() => setShowCode((s) => !s)}
            className="ml-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5"
            title={showCode ? 'Hide code' : 'Show code'}
            aria-label={showCode ? 'Hide code' : 'Show code'}
          >
            {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={regenerate}
            className="flex items-center gap-1.5 text-sm font-medium text-[#2874f0] hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <span className="text-muted-foreground/40">|</span>
          <button
            onClick={speak}
            className="flex items-center gap-1.5 text-sm font-medium text-[#2874f0] hover:underline"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Audio
          </button>
        </div>
      </div>

      {/* Input + verify */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value.replace(/\D/g, '').slice(0, FK_LEN));
              if (status !== 'idle') setStatus('idle');
            }}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            placeholder={`Enter ${FK_LEN}-digit code`}
            inputMode="numeric"
            maxLength={FK_LEN}
            className={cn(
              'pr-10 text-base tracking-[0.3em]',
              status === 'success' && 'border-green-500 ring-1 ring-green-500',
              status === 'error' && 'border-red-500 ring-1 ring-red-500'
            )}
          />
          {status === 'success' && (
            <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
          )}
        </div>
        <Button onClick={verify} className="gap-2 bg-[#2874f0] hover:bg-[#1a5fc8]">
          <ShieldCheck className="h-4 w-4" />
          Verify
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Numbers only. Click Refresh for a new code, or Audio to hear it.
      </p>
    </div>
  );
}

// ============================================================
// Page wrapper
// ============================================================

export default function CaptchaDemo() {
  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <div className="container mx-auto max-w-3xl px-4 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            CAPTCHA Demonstrations
          </h1>
          <p className="mt-2 text-muted-foreground">
            Two CAPTCHA styles — Facebook-style distorted text and Flipkart-style
            numeric code. Both include audio support for accessibility.
          </p>
        </div>

        <div className="space-y-6">
          <FacebookCaptcha />
          <FlipkartCaptcha />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          These are interactive demos. No data is sent to any server.
        </p>
      </div>
    </div>
  );
}
