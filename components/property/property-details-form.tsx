"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProperty } from "@/app/(app)/properties/actions";
import { updatePropertySchema } from "@/lib/validations/property";

type PropertyDetails = {
  name: string;
  address: string | null;
  totalRooms: number | null;
};

/**
 * Property details. Editable by the owner (server re-checks `property:update`);
 * everyone else sees a read-only summary.
 */
export function PropertyDetailsForm({
  canEdit,
  property,
}: {
  canEdit: boolean;
  property: PropertyDetails;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(updatePropertySchema),
    defaultValues: {
      name: property.name,
      address: property.address ?? "",
      totalRooms: property.totalRooms == null ? "" : String(property.totalRooms),
    },
  });

  if (!canEdit) {
    return (
      <dl className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Name</dt>
          <dd className="text-sm font-medium">{property.name}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Address</dt>
          <dd className="text-sm font-medium text-right">
            {property.address ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Total rooms</dt>
          <dd className="text-sm font-medium">{property.totalRooms ?? "—"}</dd>
        </div>
      </dl>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateProperty(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Property updated");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Property name</Label>
        <Input
          id="name"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">
          Address{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="address"
          aria-invalid={errors.address ? true : undefined}
          {...register("address")}
        />
        {errors.address ? (
          <p className="text-sm text-destructive">{errors.address.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="totalRooms">
          Total rooms{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="totalRooms"
          inputMode="numeric"
          aria-invalid={errors.totalRooms ? true : undefined}
          {...register("totalRooms")}
        />
        {errors.totalRooms ? (
          <p className="text-sm text-destructive">{errors.totalRooms.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
