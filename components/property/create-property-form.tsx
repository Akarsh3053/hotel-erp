"use client";

import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProperty } from "@/app/(app)/properties/actions";
import { createPropertySchema } from "@/lib/validations/property";

/**
 * Create-property form. The server action provisions the Clerk org + DB rows
 * and returns the new organization id, which we activate client-side so the
 * new property becomes the session's active tenant before we land home.
 */
export function CreatePropertyForm() {
  const router = useRouter();
  const { setActive } = useClerk();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPropertySchema),
    defaultValues: { name: "", address: "", totalRooms: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createProperty(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    try {
      await setActive({ organization: result.organizationId });
    } catch {
      // Non-fatal — the app shell auto-activates the property on next load.
    }
    toast.success("Property created");
    router.push("/");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Property name</Label>
        <Input
          id="name"
          placeholder="Seaside Inn"
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
          Address <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="address"
          placeholder="123 Harbour Road, Portside"
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
          placeholder="24"
          aria-invalid={errors.totalRooms ? true : undefined}
          {...register("totalRooms")}
        />
        {errors.totalRooms ? (
          <p className="text-sm text-destructive">{errors.totalRooms.message}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" data-icon="inline-start" />
            Creating…
          </>
        ) : (
          "Create property"
        )}
      </Button>
    </form>
  );
}
