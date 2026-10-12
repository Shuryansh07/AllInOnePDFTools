import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("rotate-pdf");

export default function Page() {
  return <ToolRoute slug="rotate-pdf" />;
}
