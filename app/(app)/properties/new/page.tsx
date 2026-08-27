import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { CreatePropertyForm } from "@/components/property/create-property-form";

export const metadata = { title: "New property" };

export default function NewPropertyPage() {
  return (
    <>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>
      <PageHeader
        title="Create a property"
        description="This becomes its own workspace. You'll be its owner and can invite staff next."
      />
      <CreatePropertyForm />
    </>
  );
}
