import Link from "next/link";
import { FileText } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { categories } from "@/config/tools";
import { siteConfig } from "@/config/site";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-4" aria-hidden />
          </span>
          {siteConfig.name}
        </Link>

        <nav aria-label="Tool categories" className="hidden items-center gap-5 text-sm md:flex">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/#${category.id}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {category.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
