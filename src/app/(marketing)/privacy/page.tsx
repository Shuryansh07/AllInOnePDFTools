import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { tools } from "@/config/tools";
import { toolContent } from "@/config/tool-content";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${siteConfig.name} handles your files, passwords and data.`,
  alternates: { canonical: "/privacy" },
};

const available = tools.filter((tool) => tool.status === "available");
const browserTools = available.filter((tool) => toolContent[tool.slug]?.processing === "browser");
const serverTools = available.filter((tool) => toolContent[tool.slug]?.processing === "server");

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-muted-foreground">
        {siteConfig.name} is built so that your documents stay yours. This page explains exactly what happens to
        them.
      </p>

      <div className="mt-10 space-y-10 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ul]:text-muted-foreground">
        <section>
          <h2>In short</h2>
          <ul>
            <li>You don&apos;t need an account, and we don&apos;t ask for your name or email.</li>
            <li>Most tools process your file entirely in your browser. It is never uploaded.</li>
            <li>A few tools need a server. Those files are deleted immediately after processing.</li>
            <li>We don&apos;t sell your data, and we don&apos;t use your files for anything else.</li>
          </ul>
        </section>

        <section>
          <h2>Tools that run in your browser</h2>
          <p>
            These tools work on your device. Your files are not sent to our servers and we never see them:
          </p>
          <ul>
            {browserTools.map((tool) => (
              <li key={tool.slug}>{tool.name}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Tools that run on our server</h2>
          <p>
            These tools need software that can&apos;t run in a browser, so your file is uploaded to our server over an
            encrypted connection:
          </p>
          <ul>
            {serverTools.map((tool) => (
              <li key={tool.slug}>{tool.name}</li>
            ))}
          </ul>
          <p>
            The file is held only for as long as it takes to process, in a temporary location, and is deleted as soon
            as the result has been sent back to you, including when processing fails. We don&apos;t keep copies and
            we don&apos;t read the contents of your files.
          </p>
        </section>

        <section>
          <h2>Passwords</h2>
          <p>
            Passwords you enter for Protect PDF and Unlock PDF are used only to perform that single operation. They are
            not stored or logged. We cannot recover a forgotten password, and we cannot open a protected file without
            it.
          </p>
        </section>

        <section>
          <h2>Logs and technical data</h2>
          <p>
            Like any website, our hosting infrastructure may record standard technical data such as IP address, time
            and requested page in access logs. We use this to keep the service running and to limit abuse, for example
            by limiting how many requests one address can make per minute. Our application logs record error types for
            troubleshooting, never file contents or passwords.
          </p>
        </section>

        <section>
          <h2>Cookies and tracking</h2>
          <p>
            We don&apos;t use advertising or tracking cookies. Your browser stores a single preference, your light or
            dark theme choice, on your own device.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>
            If we change how files or data are handled, we will update this page, and the explanation shown on each
            tool, before the change takes effect.
          </p>
        </section>

        {siteConfig.contactEmail && (
          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy? Email{" "}
              <a className="underline underline-offset-4" href={`mailto:${siteConfig.contactEmail}`}>
                {siteConfig.contactEmail}
              </a>
              .
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
