"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TimeframeToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("timeframe") === "today" ? "today" : "month";

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams);
        if (value === "today") {
          params.set("timeframe", "today");
        } else {
          params.delete("timeframe");
        }
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="month">This Month</TabsTrigger>
        <TabsTrigger value="today">Today</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
