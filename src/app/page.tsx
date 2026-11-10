import { ArrowRight, Blocks, Code2, Layers3 } from "lucide-react";
import { ComponentDemo } from "@/components/component-demo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const features = [
  { icon: Layers3, title: "Next.js App Router", description: "Server Components, TypeScript, and a clean src directory." },
  { icon: Code2, title: "Tailwind CSS", description: "Utility classes and shared theme tokens, ready to customize." },
  { icon: Blocks, title: "shadcn/ui", description: "Accessible components in your codebase. Make them your own." },
];

export default function Home() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Blocks className="size-4" /></span>
            Starter
          </a>
          <nav aria-label="Main navigation" className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild><a href="https://nextjs.org/docs" target="_blank" rel="noreferrer">Documentation <ArrowRight className="size-3.5" /></a></Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <section className="max-w-2xl space-y-6">
          <Badge variant="secondary" className="gap-2"><span className="size-1.5 rounded-full bg-emerald-500" />Your next project starts here</Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.1]">A simple foundation.<br /><span className="text-muted-foreground">Ready for your ideas.</span></h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">Next.js, Tailwind CSS, and shadcn/ui, wired together with the essentials so you can start building.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild><a href="#components">Explore components <ArrowRight /></a></Button>
            <Button variant="outline" asChild><a href="https://ui.shadcn.com/docs" target="_blank" rel="noreferrer">shadcn/ui docs</a></Button>
          </div>
        </section>
        <div className="my-14 grid gap-8 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="space-y-3">
              <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <Separator />
        <section id="components" className="scroll-mt-8 pt-12">
          <div className="mb-6 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Make yourself at home</h2>
            <p className="text-sm text-muted-foreground">A few components to try. The source is yours to edit.</p>
          </div>
          <ComponentDemo />
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
          <span>Built with Next.js, Tailwind CSS & shadcn/ui.</span>
          <span>Start editing <code className="font-mono text-foreground">src/app/page.tsx</code></span>
        </div>
      </footer>
    </div>
  );
}
