import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("merge-pdf");

export default function Page() {
  return <ToolRoute slug="merge-pdf" />;
}
