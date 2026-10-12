import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("delete-pages");

export default function Page() {
  return <ToolRoute slug="delete-pages" />;
}
