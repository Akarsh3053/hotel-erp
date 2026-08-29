"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PropertyImage = {
  publicId: string;
  url: string;
};

export function PropertyImagesManager({
  images,
  canEdit,
}: {
  images: PropertyImage[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5 MB)");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG and WebP accepted");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("photo", file);

    try {
      const res = await fetch(`/api/properties/photos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
      toast.success("Photo uploaded");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm("Remove this property image?")) return;

    setDeletingId(publicId);
    try {
      const res = await fetch(`/api/properties/photos?publicId=${encodeURIComponent(publicId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Delete failed");
      toast.success("Photo removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  const atLimit = images.length >= 4;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Property Images</CardTitle>
          <CardDescription>
            Showcase your property with up to 4 images.
          </CardDescription>
        </div>
        {canEdit && !atLimit && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Camera data-icon="inline-start" />
              )}
              {uploading ? "Uploading…" : "Add Image"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
            <ImageIcon className="mb-2 size-8 text-muted-foreground/30" />
            <p>No property images added yet.</p>
            {canEdit && <p className="text-xs">Upload photos to identify your property.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {images.map((img) => (
              <div key={img.publicId} className="group relative aspect-video sm:aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt="Property"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {canEdit && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="rounded-full shadow-md"
                      disabled={deletingId === img.publicId}
                      onClick={() => handleDelete(img.publicId)}
                    >
                      {deletingId === img.publicId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {atLimit && canEdit && (
          <p className="mt-4 text-xs text-muted-foreground">
            You have reached the maximum limit of 4 images. Remove an existing image to upload a new one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
