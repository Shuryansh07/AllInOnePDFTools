import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("reorder-pages");

export default function Page() {
  return <ToolRoute slug="reorder-pages" />;
}
