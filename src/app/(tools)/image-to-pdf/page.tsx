import { ToolRoute, toolRouteMetadata } from "@/components/tools/tool-route";

export const metadata = toolRouteMetadata("image-to-pdf");

export default function Page() {
  return <ToolRoute slug="image-to-pdf" />;
}
