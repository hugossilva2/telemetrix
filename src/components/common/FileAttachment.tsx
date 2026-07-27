import { useEffect, useId, useRef, useState } from "react";
import { Camera, FileText, Paperclip, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Props {
  label?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

const FILE_ACCEPT =
  "image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

/**
 * Campo de anexo reutilizável: câmera ou galeria/arquivo, com prévia.
 */
export function FileAttachment({ label = "Anexo (opcional)", file, onChange }: Props) {
  const uid = useId().replace(/:/g, "");
  const cameraId = `att-cam-${uid}`;
  const fileId = `att-file-${uid}`;
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clear = () => {
    onChange(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {file ? (
        <div className="relative">
          {preview ? (
            <img
              src={preview}
              alt="Prévia do anexo"
              className="max-h-56 w-full rounded-lg bg-muted/50 object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-4 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
            aria-label="Remover anexo"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label
            htmlFor={cameraId}
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-5 text-xs text-muted-foreground hover:bg-muted/50"
          >
            <Camera className="size-4" />
            Tirar foto
          </label>
          <label
            htmlFor={fileId}
            className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-5 text-xs text-muted-foreground hover:bg-muted/50"
          >
            <Paperclip className="size-4" />
            Galeria ou arquivo
          </label>
        </div>
      )}
      <input
        id={cameraId}
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <input
        id={fileId}
        ref={fileRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
