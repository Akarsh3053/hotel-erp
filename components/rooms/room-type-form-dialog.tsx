"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createRoomTypeSchema,
} from "@/lib/validations/room";
import { createRoomType, updateRoomType } from "@/app/(app)/rooms/actions";

export type RoomTypeData = {
  id: string;
  name: string;
  description: string | null;
  pricingType: "fixed" | "flexi";
  displayPrice: string | null;
  maxOccupancy: number | null;
};

export function RoomTypeFormDialog({
  open,
  onOpenChange,
  editingRoomType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRoomType?: RoomTypeData | null;
}) {
  const router = useRouter();
  const isEditing = Boolean(editingRoomType);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createRoomTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      pricingType: "fixed" as "fixed" | "flexi",
      displayPrice: "" as unknown as number | undefined,
      maxOccupancy: 2 as unknown as number | undefined,
    },
  });

  useEffect(() => {
    if (editingRoomType) {
      reset({
        name: editingRoomType.name,
        description: editingRoomType.description ?? "",
        pricingType: editingRoomType.pricingType,
        displayPrice: editingRoomType.displayPrice ? Number(editingRoomType.displayPrice) : undefined,
        maxOccupancy: editingRoomType.maxOccupancy ?? 2,
      });
    } else {
      reset({
        name: "",
        description: "",
        pricingType: "fixed",
        displayPrice: undefined,
        maxOccupancy: 2,
      });
    }
  }, [editingRoomType, reset, open]);

  const onSubmit = handleSubmit(async (values) => {
    const result = isEditing && editingRoomType
      ? await updateRoomType(editingRoomType.id, values)
      : await createRoomType(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Room type updated" : "Room type created");
    onOpenChange(false);
    reset();
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit room type" : "Add room type"}
            </DialogTitle>
            <DialogDescription>
              Define categories like Deluxe, Suite, or Standard with baseline
              capacity and pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rt-name">Name</Label>
              <Input
                id="rt-name"
                placeholder="e.g. Deluxe Double"
                autoComplete="off"
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rt-pricing">Pricing Type</Label>
                <Controller
                  name="pricingType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="rt-pricing">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="flexi">Flexible (Negotiable)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.pricingType ? (
                  <p className="text-sm text-destructive">
                    {errors.pricingType.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rt-price">
                  Base price <span className="font-normal text-muted-foreground">({errors.pricingType?.message ? "" : "₹/night"})</span>
                </Label>
                <Input
                  id="rt-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="120.00"
                  aria-invalid={errors.displayPrice ? true : undefined}
                  {...register("displayPrice")}
                />
                {errors.displayPrice ? (
                  <p className="text-sm text-destructive">
                    {errors.displayPrice.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rt-occupancy">Max guests</Label>
                <Input
                  id="rt-occupancy"
                  type="number"
                  min="1"
                  max="20"
                  placeholder="2"
                  aria-invalid={errors.maxOccupancy ? true : undefined}
                  {...register("maxOccupancy")}
                />
                {errors.maxOccupancy ? (
                  <p className="text-sm text-destructive">
                    {errors.maxOccupancy.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rt-desc">
                Description{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="rt-desc"
                placeholder="Ocean view with king-size bed, ensuite bathroom, and mini bar."
                aria-invalid={errors.description ? true : undefined}
                {...register("description")}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Saving…
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Create room type"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
