import { createFileRoute } from "@tanstack/react-router";
import { FishingApp } from "@/components/fishing/shell";
import { liveConditions } from "@/lib/fishing/live";
import { todayInCharleston } from "@/lib/fishing/time";
import type { ConditionsResult } from "@/lib/fishing/types";

export const Route = createFileRoute("/")({
  loader: async (): Promise<{ conditions: ConditionsResult }> => {
    const date = todayInCharleston();
    try {
      const conditions = await liveConditions(date);
      return { conditions };
    } catch {
      return { conditions: { ok: false, date, message: "The tide station didn't answer." } };
    }
  },
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  return <FishingApp initial={data.conditions} />;
}
