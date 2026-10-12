import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("compress-pdf");

export default function Page() {
  return <ToolRoute slug="compress-pdf" />;
}
