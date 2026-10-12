import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("protect-pdf");

export default function Page() {
  return <ToolRoute slug="protect-pdf" />;
}
