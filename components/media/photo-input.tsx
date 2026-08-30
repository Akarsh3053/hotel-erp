"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  imageValidationMessage,
} from "@/lib/validations/media";

type PhotoInputProps = {
  id?: string;
  name?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  /**
   * Forces the native camera on mobile when set. Omit to show the standard
   * file picker (camera + gallery). "environment" = rear camera, "user" = selfie.
   */
  capture?: "user" | "environment";
  onChange?: (file: File | null) => void;
  className?: string;
};

/**
 * Mobile-first photo capture. Shows the system file picker (camera + gallery)
 * by default, or locks to a specific camera when `capture` is supplied.
 * Previews the chosen image and rejects oversized/wrong-type files client-side
 * (spec §8). Server-side re-validation still applies on upload — this is UX,
 * not a security boundary.
 */
export function PhotoInput({
  id,
  name,
  label = "Add photo",
  hint,
  disabled,
  capture,
  onChange,
  className,
}: PhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    const error = imageValidationMessage(file);
    if (error) {
      toast.error(error);
      event.target.value = "";
      return;
    }

    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
    onChange?.(file);
  }

  function handleClear() {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
    onChange?.(null);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        {...(capture ? { capture } : {})}
        className="sr-only"
        disabled={disabled}
        onChange={handleSelect}
      />

      {preview ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          {/* Local blob preview — a plain img is correct here; next/image can't optimize blob: URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={fileName ?? "Selected photo"}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={openPicker}
              disabled={disabled}
              className="flex-1"
            >
              <RefreshCw className="size-4" aria-hidden /> Retake
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="size-4" aria-hidden /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={cn(
            "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-sm text-muted-foreground transition-colors",
            "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Camera className="size-6" aria-hidden />
          <span className="font-medium text-foreground">{label}</span>
          {hint ? <span className="text-xs">{hint}</span> : null}
        </button>
      )}
    </div>
  );
}
