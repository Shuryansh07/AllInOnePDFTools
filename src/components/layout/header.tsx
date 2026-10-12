import Link from "next/link";
import { FileText } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="size-5" aria-hidden />
          {siteConfig.name}
        </Link>
      </div>
    </header>
  );
}
