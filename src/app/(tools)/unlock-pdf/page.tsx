import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("unlock-pdf");

export default function Page() {
  return <ToolRoute slug="unlock-pdf" />;
}
