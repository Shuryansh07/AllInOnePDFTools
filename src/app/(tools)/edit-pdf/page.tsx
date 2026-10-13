import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("edit-pdf");

export default function Page() {
  return <ToolRoute slug="edit-pdf" />;
}
