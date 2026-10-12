import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
        © {siteConfig.name}. Most tools run entirely in your browser; compression uploads your file and deletes it immediately.
      </div>
    </footer>
  );
}
