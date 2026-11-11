import { ManufacturingBoard } from "@/components/manufacturing-board";
import { createDemoBoard } from "@/lib/demo-board";
import { mondayConfigured } from "@/lib/monday";

export const dynamic = "force-dynamic";

export default function Home() {
  return <ManufacturingBoard initialData={mondayConfigured() ? null : createDemoBoard()} />;
}
