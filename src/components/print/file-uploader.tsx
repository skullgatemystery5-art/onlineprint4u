import { useCallback, useState } from 'react';
import { UploadCloud, FileText, X, GripVertical, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPdfPageCount } from '@/lib/pdf-pages';

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  pages: number;
  previewUrl?: string;
};

const acceptedTypes = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png'];

function estimatePages(file: File): number {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx') || name.endsWith('.pptx')) {
    const sizeKb = file.size / 1024;
    if (sizeKb < 100) return Math.max(1, Math.round(sizeKb / 30));
    return Math.max(1, Math.round(sizeKb / 50));
  }
  return 1;
}

export function FileUploader({
  files,
  onAdd,
  onRemove,
  onReorder,
}: {
  files: UploadedFile[];
  onAdd: (files: UploadedFile[]) => void;
  onRemove: (id: string) => void;
  onReorder: (files: UploadedFile[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setLoadingPages(true);
      const incoming = Array.from(fileList);
      const newFiles: UploadedFile[] = await Promise.all(
        incoming.map(async (f) => {
          const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
          let previewUrl: string | undefined;
          if (['jpg', 'jpeg', 'png'].includes(ext)) {
            previewUrl = URL.createObjectURL(f);
          }
          let pages = 1;
          if (ext === 'pdf') {
            try {
              pages = await getPdfPageCount(f);
            } catch {
              pages = 1;
            }
          } else {
            pages = estimatePages(f);
          }
          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: f.name,
            size: f.size,
            type: ext,
            pages,
            previewUrl,
          };
        })
      );
      onAdd(newFiles);
      setLoadingPages(false);
    },
    [onAdd]
  );

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    const reordered = [...files];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(i, 0, moved);
    onReorder(reordered);
    setDragIndex(i);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-8 text-center transition-all',
          dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50'
        )}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {loadingPages ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </div>
        <p className="font-display text-sm font-semibold">
          {loadingPages ? 'Reading PDF pages…' : 'Drop files here or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DOCX, PPTX, JPG, PNG • Max 50MB
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div
              key={file.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-sm"
            >
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/40" />
              {file.previewUrl ? (
                <img src={file.previewUrl} alt={file.name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {['jpg', 'jpeg', 'png'].includes(file.type) ? (
                    <ImageIcon className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB • {file.pages} page{file.pages !== 1 ? 's' : ''} • {file.type.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => onRemove(file.id)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
