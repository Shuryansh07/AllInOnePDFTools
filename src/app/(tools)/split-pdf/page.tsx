import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("split-pdf");

export default function Page() {
  return <ToolRoute slug="split-pdf" />;
}
