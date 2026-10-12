import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {siteConfig.name}. Most tools run entirely in your browser; compression, protect and unlock upload
          your file and delete it immediately.
        </p>
        <nav aria-label="Footer">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
