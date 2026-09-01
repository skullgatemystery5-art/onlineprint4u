import { Link } from 'react-router-dom';
import { UploadCloud, FileText, ImageIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const supportedFormats = ['PDF', 'DOCX', 'PPTX', 'JPG', 'PNG'];

export function UploadArea() {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<{ name: string; size: number; type: string }[]>([]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type.split('/')[1] || 'file',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  return (
    <section id="upload" className="py-20">
      <div className="container mx-auto max-w-4xl px-4 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Drag &amp; Drop Your Documents
          </h2>
          <p className="mt-3 text-muted-foreground">
            Upload multiple files at once. We support PDF, DOCX, PPTX, JPG, and PNG.
          </p>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            'relative rounded-3xl border-2 border-dashed p-12 text-center transition-all',
            dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-card hover:border-primary/50'
          )}
        >
          <input type="file" multiple accept=".pdf,.docx,.pptx,.jpg,.png" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleFiles(e.target.files)} />
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="h-8 w-8" />
          </div>
          <p className="font-display text-lg font-semibold">Drop your files here, or click to browse</p>
          <p className="mt-1 text-sm text-muted-foreground">Max 4.5MB per file • Multiple files supported</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {supportedFormats.map((fmt) => (
              <span key={fmt} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {fmt === 'JPG' || fmt === 'PNG' ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {fmt}
              </span>
            ))}
          </div>
        </div>
        {files.length > 0 && (
          <div className="mt-6 space-y-2 animate-fade-in">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB • {file.type.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 text-center">
          <Link to="/print">
            <Button size="lg" className="gap-2">
              Continue to Print Options
              <UploadCloud className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
