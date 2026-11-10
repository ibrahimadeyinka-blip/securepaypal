import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, FileCheck2, FileText, Lock, MailX, PackageCheck, Receipt, Search, ShieldCheck, Truck, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResolveAI — Get Held PayPal Funds Released Faster" },
      { name: "description", content: "ResolveAI checks your documents before you submit, so PayPal can release held money in seconds instead of days." },
      { property: "og:title", content: "ResolveAI — Get Held PayPal Funds Released Faster" },
      { property: "og:description", content: "Check your proof before you send it. Find missing items instantly. Release held funds faster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Clock, title: "1. Your money is held", text: "PayPal holds $12,500 after a sudden jump in sales. ResolveAI explains why in plain words." },
  { icon: Search, title: "2. Upload your proof", text: "Add your purchase order, invoice and delivery record. Private details are hidden before anything leaves your device." },
  { icon: FileCheck2, title: "3. Instant check", text: "We compare all three documents and tell you exactly what is missing or does not match — before you submit." },
  { icon: Receipt, title: "4. Funds released", text: "A reviewer approves in one click. You get a signed receipt showing every step." },
];

const docs = [
  { icon: FileText, name: "Purchase order", text: "What the buyer ordered" },
  { icon: FileText, name: "Invoice", text: "What you billed" },
  { icon: Truck, name: "Delivery record", text: "Where and when it arrived" },
];

const demos = [
  { id: "clean", title: "Everything matches", text: "All proof lines up. Watch the hold get released.", tone: "text-success" },
  { id: "mismatch", title: "Numbers don't match", text: "The invoice says 45 units, the order says 50.", tone: "text-destructive" },
  { id: "nosig", title: "Missing signature", text: "Big order delivered with no one signing for it.", tone: "text-gold" },
] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="bg-hero relative overflow-hidden text-primary-foreground">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <span className="font-display text-lg font-bold">PayPal <span className="text-gold">ResolveAI</span></span>
          </div>
          <Button asChild variant="secondary"><Link to="/demo" search={{ scenario: undefined }}>Try live demo</Link></Button>
        </nav>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div className="animate-rise">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 px-3 py-1 text-xs font-semibold"><Zap className="h-3.5 w-3.5 text-gold" />Built for the PayPal AI Hackathon</p>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">Your money is on hold. <span className="text-gold">Get it back faster.</span></h1>
            <p className="mt-5 max-w-xl text-lg opacity-85">ResolveAI checks your proof before you send it. It tells you what's missing right away, so PayPal can release your funds in seconds — not days.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/demo" search={{ scenario: "clean" }}>Start the demo <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><a href="#how">How it works</a></Button>
            </div>
          </div>
          <div className="animate-rise rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-6 backdrop-blur">
            <div className="flex items-center justify-between text-sm"><span className="font-semibold">Case #PP-4821</span><span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-primary">On hold</span></div>
            <div className="mt-3 font-display text-4xl font-bold">$12,500.00</div>
            <p className="mt-1 text-sm opacity-75">Held because sales jumped 7× above normal.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Purchase order matches invoice", "Delivery address matches", "Signature on delivery"].map((t) => (
                <li key={t} className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold" />{t}</li>
              ))}
            </ul>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full w-full rounded-full bg-gold" /></div>
            <p className="mt-2 text-xs opacity-75">Ready to release · checked in 3 seconds</p>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold">The problem today</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6">
              <MailX className="h-8 w-8 text-destructive" />
              <h3 className="mt-3 text-xl font-bold">The usual way</h3>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li>• You upload whatever files you have.</li>
                <li>• Days later: "Denied — did not meet requirements."</li>
                <li>• Nobody told you what was missing.</li>
                <li>• A person compares three PDFs by hand.</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-secondary bg-card p-6">
              <PackageCheck className="h-8 w-8 text-success" />
              <h3 className="mt-3 text-xl font-bold">With ResolveAI</h3>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li>• A live checklist shows what's missing before you send.</li>
                <li>• All three documents are compared for you.</li>
                <li>• Problems are shown in red with a clear fix.</li>
                <li>• Clean cases are released in seconds.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="how" className="border-y bg-muted/40 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-3xl font-bold">How it works</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary/10"><Icon className="h-5 w-5 text-secondary" /></div>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-14 text-center text-xl font-bold">The three documents we compare</h3>
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-3">
              {docs.map(({ icon: Icon, name, text }, i) => (
                <div key={name} className="flex items-center gap-3">
                  {i > 0 && <span className="font-bold text-muted-foreground">⟷</span>}
                  <div className="rounded-xl border bg-card px-4 py-3 text-center">
                    <Icon className="mx-auto h-5 w-5 text-secondary" />
                    <div className="mt-1 text-sm font-semibold">{name}</div>
                    <div className="text-xs text-muted-foreground">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold">Pick a story to try</h2>
          <p className="mt-2 text-center text-muted-foreground">Each one opens the live demo with sample documents ready to load.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {demos.map((d) => (
              <Link key={d.id} to="/demo" search={{ scenario: d.id }} className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:border-secondary hover:shadow-lg">
                <h3 className={`text-lg font-bold ${d.tone}`}>{d.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary">Open demo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-hero text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-12">
            <div className="flex items-center gap-3"><Lock className="h-6 w-6 text-gold" /><p className="max-w-lg text-sm opacity-90">Private details are hidden on your device. Every file gets a unique fingerprint so no one can change it later. This is a hackathon demo — no real PayPal money is moved.</p></div>
            <Button asChild size="lg" variant="secondary"><Link to="/demo" search={{ scenario: undefined }}>Open live demo <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>
    </div>
  );
}
