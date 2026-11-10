import { Button } from "@/components/ui/button";
import { EvidenceComparison } from "@/components/evidence-comparison";
import { evaluatePreflight } from "@/lib/preflight";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ShieldCheck, Upload, FileText, Hash, Sparkles, CheckCircle2, XCircle,
  Truck, Clock, Download, Store, Scale, Lock, Eye, EyeOff, Loader2, Receipt,
  Terminal, X, Copy, Check, BadgeCheck,
} from "lucide-react";
import {
  analyzeGaps, guessKind, now, redactPII, sha256Hex,
  type AuditEvent, type EvidenceDoc, type DocKind,
} from "@/lib/resolve";
import {
  SCENARIOS, sellerProtection, evOrderCompleted, evRiskHold, evProvideEvidence, evDisputeUpdated, evRelease, evResolved,
  type ApiEvent, type ScenarioId,
} from "@/lib/paypal";

export const Route = createFileRoute("/demo")({
  validateSearch: (s: Record<string, unknown>): { scenario?: ScenarioId | undefined } => ({ scenario: ["clean","mismatch","nosig"].includes(s["scenario"] as string) ? (s["scenario"] as ScenarioId) : undefined }),
  head: () => ({
    meta: [
      { title: "ResolveAI Live Demo — Release a PayPal Hold" },
      { name: "description", content: "Merchants submit sealed evidence, AI finds gaps, analysts release holds in one click." },
      { property: "og:title", content: "ResolveAI Live Demo — Release a PayPal Hold" },
      { property: "og:description", content: "Live evidence pre-flight checks, three-way document reconciliation and simulated hold resolution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type View = "merchant" | "analyst" | "receipt";
type Decision = { status: "approved"; at: string; txn: string; api: object } | null;

const KIND_LABEL: Record<DocKind, string> = { invoice: "Supplier invoice", po: "Wholesale PO", manifest: "Carrier manifest" };
const HOLD_DEADLINE = Date.now() + 1000 * 60 * 60 * 71 + 1000 * 60 * 23;

const initialEvents = (): ApiEvent[] => {
  const t0 = new Date(Date.now() - 1000 * 60 * 47).toISOString();
  const t1 = new Date(Date.now() - 1000 * 60 * 46).toISOString();
  return [evOrderCompleted(t0), evRiskHold(t1)];
};

function App() {
  const [view, setView] = useState<View>("merchant");
  const [scenario, setScenario] = useState<ScenarioId>(Route.useSearch().scenario ?? "clean");
  const [docs, setDocs] = useState<EvidenceDoc[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([
    { at: now(), actor: "PayPal Risk Engine", action: "Hold placed on $12,500.00 — velocity anomaly (7.4× 30-day avg)" },
  ]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [autoPending, setAutoPending] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  useEffect(() => { setEvents(initialEvents()); setUnseen(2); }, []);
  const log = (actor: string, action: string, hash?: string) =>
    setAudit((a) => [...a, { at: now(), actor, action, hash }]);
  const emit = (...e: ApiEvent[]) => { setEvents((x) => [...x, ...e]); if (!drawer) setUnseen((n) => n + e.length); };
  const analysis = useMemo(() => analyzeGaps(docs), [docs]);
  const sp = useMemo(() => sellerProtection(docs), [docs]);

  const preflight = useMemo(() => evaluatePreflight(docs), [docs]);
  const approve = (d: NonNullable<Decision>, actor: string) => {
    if (!submitted || !preflight.ready || decision) return;
    setDecision(d); setAutoPending(false);
    log(actor, `Approved simulated release — ${d.txn}`);
    log("PayPal Payments API (simulated)", "Reserve released: $12,500.00 restored to available balance");
    emit(evRelease(d.at, d.txn), evResolved(d.at, sp.eligible));
  };
  useEffect(() => {
    if (!autoPending || !submitted || !preflight.ready || decision) return;
    const timer = setTimeout(() => {
      const at = now();
      const txn = "REL-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      approve({ status: "approved", at, txn, api: { simulated: true, approval_mode: "automatic", hold_status: "RELEASED", release_id: txn, amount: { currency_code: "USD", value: "12500.00" }, released_at: at } }, "ResolveAI · automated demo review");
    }, 3000);
    return () => clearTimeout(timer);
  }, [autoPending, submitted, preflight.ready, decision]);

  const reset = (id: ScenarioId) => {
    setAutoPending(false); setAutoApprove(false); setScenario(id); setDocs([]); setSubmitted(false); setDecision(null); setView("merchant");
    setAudit([{ at: now(), actor: "PayPal Risk Engine", action: "Hold placed on $12,500.00 — velocity anomaly (7.4× 30-day avg)" }]);
    setEvents(initialEvents()); setUnseen(2);
  };

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-hero relative overflow-hidden text-primary-foreground">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Back to overview"><Logo className="h-10 w-10" /></Link>
            <div>
              <div className="font-display text-lg font-bold tracking-tight">PayPal <span className="text-gold">ResolveAI</span></div>
              <Link to="/" className="text-xs opacity-70 hover:opacity-100">← Back to overview</Link>
            </div>
          </div>
          <nav className="flex rounded-xl bg-primary-foreground/10 p-1 text-sm font-semibold backdrop-blur">
            {([
              ["merchant", "Merchant", Store],
              ["analyst", "Analyst", Scale],
              ["receipt", "Receipt", Receipt],
            ] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-300 ${view === v ? "bg-primary-foreground text-primary shadow-lg" : "hover:bg-primary-foreground/10"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </nav>
          <button onClick={() => { setDrawer(true); setUnseen(0); }}
            className="relative flex items-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-2 text-sm font-semibold transition hover:bg-primary-foreground/15">
            <Terminal className="h-4 w-4" />Developer console
            {unseen > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary animate-pulse">{unseen}</span>}
          </button>
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="mr-1 font-semibold uppercase tracking-wider opacity-60">Demo scenario</span>
            {SCENARIOS.map((s) => (
              <button key={s.id} onClick={() => reset(s.id)} title={s.tagline}
                className={`rounded-full border px-3 py-1 font-semibold transition-all ${scenario === s.id ? "border-gold bg-gold text-primary" : "border-primary-foreground/25 hover:border-primary-foreground/60"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main key={view + scenario} className="animate-rise mx-auto max-w-6xl space-y-6 px-6 py-8">
        {view === "merchant" && (
          <Merchant docs={docs} setDocs={setDocs} log={log} analysis={analysis} sp={sp}
            samples={(SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0]!).samples}
            preflight={preflight} autoApprove={autoApprove} setAutoApprove={setAutoApprove} autoPending={autoPending}
            submitted={submitted} decision={decision}
            onSubmit={() => {
              if (!preflight.ready || submitted) return;
              setSubmitted(true); setAutoPending(autoApprove);
              log("Merchant", `Defense packet submitted (${docs.length} artifacts, readiness ${analysis.readiness}%)`);
              const t = now(); emit(evProvideEvidence(t, docs, sp.tracking), evDisputeUpdated(t));
            }} />
        )}
        {view === "analyst" && (
          <Analyst docs={docs} analysis={analysis} audit={audit} submitted={submitted} decision={decision} sp={sp}
            onApprove={(d) => approve(d, "Analyst · K. Mensah")} preflight={preflight} autoPending={autoPending} />
        )}
        {view === "receipt" && <ReceiptView docs={docs} audit={audit} decision={decision} analysis={analysis} sp={sp} />}
      </main>
      <DevConsole open={drawer} onClose={() => setDrawer(false)} events={events} />
    </div>
  );
}

function DevConsole({ open, onClose, events }: { open: boolean; onClose: () => void; events: ApiEvent[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cur = events.find((e) => e.id === sel) ?? events[events.length - 1];
  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-console text-console-foreground shadow-2xl transition-transform duration-500 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-console-foreground/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 font-display font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-success" />PayPal REST API & Webhooks</div>
            <div className="font-mono text-[11px] opacity-60">api-m.sandbox.paypal.com · v1/v2 · live event stream</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-console-foreground/10"><X className="h-5 w-5" /></button>
        </div>
        <ol className="max-h-[42%] space-y-1 overflow-auto border-b border-console-foreground/10 p-3">
          {events.map((e, i) => (
            <li key={e.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-rise">
              <button onClick={() => setSel(e.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-xs transition ${cur?.id === e.id ? "bg-console-foreground/10" : "hover:bg-console-foreground/5"}`}>
                {e.type === "webhook"
                  ? <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">WEBHOOK</span>
                  : <span className="rounded bg-secondary/30 px-1.5 py-0.5 text-[10px] font-bold text-secondary">{e.method}</span>}
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {e.status && <span className="text-success">{e.status}</span>}
                <span className="opacity-50">{new Date(e.at).toLocaleTimeString()}</span>
              </button>
            </li>
          ))}
        </ol>
        {cur && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-5 py-2 text-xs">
              <span className="font-semibold opacity-70">{cur.type === "webhook" ? "Event payload" : "Request / response"}</span>
              <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(cur.payload, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                className="flex items-center gap-1 rounded px-2 py-1 hover:bg-console-foreground/10">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy JSON"}</button>
            </div>
            <pre key={cur.id} className="animate-rise min-h-0 flex-1 overflow-auto px-5 pb-5 font-mono text-[11px] leading-relaxed"><JsonView v={cur.payload} /></pre>
          </div>
        )}
      </aside>
    </>
  );
}

function JsonView({ v }: { v: unknown }) {
  const s = JSON.stringify(v, null, 2);
  return <>{s.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|\b-?\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/).map((t, i) =>
    /^".*":$/.test(t) ? <span key={i} className="text-secondary">{t}</span>
      : /^"/.test(t) ? <span key={i} className="text-gold">{t}</span>
      : /^(-?\d|true|false|null)/.test(t) ? <span key={i} className="text-success">{t}</span> : t)}</>;
}

function SellerProtectionCard({ sp, compact }: { sp: ReturnType<typeof sellerProtection>; compact?: boolean }) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-colors duration-500 ${sp.eligible ? "border-success/40 bg-success/5" : "bg-card"}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-full ${sp.eligible ? "animate-stamp bg-success text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <BadgeCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="font-display font-bold">{sp.eligible ? "Eligible for PayPal Seller Protection" : "Not yet eligible for Seller Protection"}</div>
          <div className="text-xs text-muted-foreground">Item Not Received · Unauthorized Transaction</div>
        </div>
      </div>
      {!compact && (
        <ul className="space-y-1.5">
          {sp.rules.map((r) => (
            <li key={r.id} className="flex gap-2 text-sm">
              {r.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
              <div><span className="font-semibold">{r.label}</span><span className="text-muted-foreground"> — {r.detail}</span></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Card({ title, icon: Icon, children, right }: { title: string; icon: typeof Hash; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold"><Icon className="h-4 w-4 text-secondary" />{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Countdown() {
  const [t, setT] = useState(0);
  useEffect(() => { const tick = () => setT(HOLD_DEADLINE - Date.now()); tick(); const i = setInterval(tick, 1000); return () => clearInterval(i); }, []);
  const s = Math.max(0, Math.floor(t / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return <span className="font-mono text-2xl font-semibold">{p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</span>;
}

function HoldBanner({ released }: { released: boolean }) {
  if (released)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-5">
        <CheckCircle2 className="h-6 w-6 text-success" />
        <div><div className="font-bold">Case #PP-4821 resolved — $12,500.00 released</div><div className="text-sm text-muted-foreground">Funds are back in your available balance.</div></div>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning/50 bg-warning/10 p-5">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-warning" />
        <div>
          <div className="font-bold">Active Hold · Case #PP-4821 · $12,500.00 reserved</div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            <b className="text-foreground">Why:</b> You received $12,500 in 48 hours — about 7× your usual volume — from a single new buyer.
            Our systems pause funds like this to protect you and the buyer. Show us where the goods came from and that they were delivered.
          </p>
        </div>
      </div>
      <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Respond within</div><Countdown /></div>
    </div>
  );
}

type Analysis = ReturnType<typeof analyzeGaps>;

type SP = ReturnType<typeof sellerProtection>;

function Merchant({ docs, setDocs, log, analysis, submitted, onSubmit, decision, sp, samples, preflight, autoApprove, setAutoApprove, autoPending }: {
  preflight: ReturnType<typeof evaluatePreflight>; autoApprove: boolean; setAutoApprove: (value: boolean) => void; autoPending: boolean;
  docs: EvidenceDoc[]; setDocs: React.Dispatch<React.SetStateAction<EvidenceDoc[]>>;
  log: (a: string, b: string, h?: string) => void; analysis: Analysis; submitted: boolean; onSubmit: () => void; decision: Decision;
  sp: SP; samples: { name: string; text: string }[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function add(name: string, buf: ArrayBuffer, text: string) {
    const hash = await sha256Hex(buf);
    const { text: redacted, count } = redactPII(text);
    const d: EvidenceDoc = { id: crypto.randomUUID(), name, kind: guessKind(name), size: buf.byteLength, hash, uploadedAt: now(), original: text, redacted, piiCount: count };
    setDocs((x) => [...x, d]);
    setPreview(d.id);

    log("Merchant", `Uploaded ${name} · ${count} PII fields redacted`, hash);
  }
  async function onFiles(files: FileList | null) {
    if (submitted || uploading) return;
    setUploading(true);
    try { for (const f of Array.from(files ?? [])) {
      const buf = await f.arrayBuffer();
      const text = /text|json|csv/.test(f.type) || /\.(txt|csv|json)$/i.test(f.name) ? new TextDecoder().decode(buf) : `[binary ${f.type || "file"} — ${f.size} bytes, text extraction unavailable]`;
      await add(f.name, buf, text);
    } } finally { setUploading(false); }
  }
  async function loadSamples() {
    if (submitted || uploading) return;
    setUploading(true);
    try { for (const s of samples) if (!docs.some((d) => d.name === s.name)) await add(s.name, new TextEncoder().encode(s.text).buffer as ArrayBuffer, s.text); } finally { setUploading(false); }
  }
  const p = docs.find((d) => d.id === preview);

  return (
    <>
      <HoldBanner released={!!decision} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Secure evidence upload" icon={Lock} right={<Button variant="link" size="sm" disabled={submitted || uploading} onClick={loadSamples}>Load sample documents</Button>}>
            <Button variant="outline" onClick={() => input.current?.click()} disabled={submitted || uploading}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-secondary/40 bg-accent/40 h-auto whitespace-normal p-8 text-center transition hover:bg-accent disabled:opacity-50">
              <Upload className="h-6 w-6 text-secondary" />
              <span className="font-semibold">Drop supplier invoices, wholesale POs, carrier manifests</span>
              <span className="text-xs text-muted-foreground">Hashed with SHA-256 & PII-redacted in your browser before anything leaves your device</span>
            </Button>
            <input ref={input} type="file" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            <ul className="mt-4 divide-y">
              {docs.map((d) => (
                <li key={d.id} className={`flex cursor-pointer items-center gap-3 py-2.5 ${preview === d.id ? "text-secondary" : ""}`} onClick={() => setPreview(d.id)}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">sha256:{d.hash}</div>
                  </div>
                  <Button variant="ghost" size="icon" disabled={submitted || uploading} aria-label={`Remove ${d.name}`} title="Remove document" onClick={(e) => { e.stopPropagation(); setDocs((x) => x.filter((y) => y.id !== d.id)); log("Merchant", `Removed ${d.name}`); }}><X className="h-4 w-4" /></Button>
                  <select disabled={submitted || uploading} aria-label={`Document type for ${d.name}`} value={d.kind} onClick={(e) => e.stopPropagation()} onChange={(e) => setDocs((x) => x.map((y) => y.id === d.id ? { ...y, kind: e.target.value as DocKind } : y))}
                    className="rounded border bg-background px-1.5 py-1 text-xs">
                    {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </Card>
          {p && (
            <Card title="PII redaction preview" icon={showRaw ? Eye : EyeOff}
              right={<button onClick={() => setShowRaw(!showRaw)} className="text-xs font-semibold text-secondary">{showRaw ? "Show redacted" : "Show original (local only)"}</button>}>
              <div className="mb-2 text-xs text-muted-foreground">{p.piiCount} sensitive field(s) masked · analysts only see the redacted version</div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
                {(showRaw ? p.original : p.redacted).split(/(\[(?:EMAIL|CARD|SSN|PHONE)\])/).map((s, i) =>
                  /^\[(EMAIL|CARD|SSN|PHONE)\]$/.test(s) ? <mark key={i} className="rounded bg-primary px-1 text-primary-foreground">{s}</mark> : s)}
              </pre>
            </Card>
          )}
        </div>
        <div className="space-y-6 lg:col-span-2">
          <section className="border-t pt-5" aria-labelledby="preflight-title">
            <div className="mb-4 flex items-center justify-between gap-2"><h2 id="preflight-title" className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-secondary" />Live Seller Protection Pre-flight</h2><span className="text-xs font-mono text-muted-foreground">{uploading ? "Reading…" : "LIVE"}</span></div>
            <div aria-live="polite" className="mb-4">
              <div className="flex justify-between text-sm font-semibold"><span>{preflight.ready ? "Ready to submit" : `${preflight.blockers.length} checks need attention`}</span><span>{preflight.readiness}%</span></div>
              <progress aria-label="Evidence readiness" value={preflight.readiness} max={100} className="mt-2 h-2 w-full accent-success" />
            </div>
            <ul className="space-y-3">{preflight.checks.map((check) => <li key={check.id} className="flex gap-2 text-sm">
              {check.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
              <div><div className="font-semibold">{check.label}</div>{!check.pass && <p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p>}</div>
            </li>)}</ul>
            <a href="https://www.paypal.com/us/legalhub/paypal/seller-protection" target="_blank" rel="noreferrer" className="mt-4 block text-xs text-secondary underline">PayPal Seller Protection requirements ↗</a>
            <p className="mt-2 text-xs text-muted-foreground">Evidence readiness estimate, not a PayPal eligibility decision. Transaction eligibility and carrier records are not independently verified.</p>
            <label className="mt-5 flex items-start gap-2 border-t pt-4 text-sm"><input type="checkbox" checked={autoApprove} disabled={submitted} onChange={(e) => setAutoApprove(e.target.checked)} className="mt-1 accent-primary" /><span className="font-semibold">Automatic approval (demo)<span className="mt-1 block text-xs font-normal text-muted-foreground">Clean evidence only · simulated release in 3 seconds</span></span></label>
            <Button disabled={!preflight.ready || submitted || uploading} onClick={onSubmit} className="mt-4 h-auto min-h-10 w-full whitespace-normal py-3">{autoPending ? <><Loader2 className="animate-spin" />Simulated review in progress…</> : decision ? "Demo hold released ✓" : submitted ? "Submitted to Compliance ✓" : "Submit verified defense packet"}</Button>
            {!preflight.ready && <p className="mt-2 text-xs text-destructive">Submission locked until every required check passes.</p>}
          </section>

        </div>
      </div>
      <EvidenceComparison result={preflight} />
      {docs.length > 0 && <section className="border-t pt-5"><h2 className="mb-2 flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-secondary" />Evidence brief</h2><p className="text-sm text-muted-foreground">{analysis.summary}</p></section>}
    </>
  );
}

function Analyst({ docs, analysis, audit, submitted, decision, onApprove, sp, preflight, autoPending }: {
  preflight: ReturnType<typeof evaluatePreflight>; autoPending: boolean;
  docs: EvidenceDoc[]; analysis: Analysis; audit: AuditEvent[]; submitted: boolean; decision: Decision; onApprove: (d: NonNullable<Decision>) => void; sp: SP;
}) {
  const [busy, setBusy] = useState(false);
  const hasManifest = docs.some((d) => d.kind === "manifest");
  const delivered = sp.rules.find((r) => r.id === "delivered")?.pass;
  const signed = sp.rules.find((r) => r.id === "signature")?.pass;
  const track = docs.map((d) => d.original.match(/1Z[0-9A-Z]{16}/)?.[0]).find(Boolean);
  const risk = analysis.riskScore;

  if (!submitted)
    return <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground"><Clock className="mx-auto mb-2 h-6 w-6" />Waiting for the merchant to submit a defense packet for Case #PP-4821.</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card title="Synthesized evidence brief" icon={Sparkles}>
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
          <ul className="mt-4 space-y-1.5">
            {docs.map((d) => <li key={d.id} className="flex items-center gap-2 text-xs"><ShieldCheck className="h-3.5 w-3.5 text-success" /><b>{KIND_LABEL[d.kind]}</b><span className="truncate font-mono text-muted-foreground">{d.hash.slice(0, 24)}…</span></li>)}
          </ul>
        </Card>
        <EvidenceComparison result={preflight} />
        <Card title="Risk timeline" icon={Clock}>
          <ol className="relative space-y-3 border-l pl-5">
            {audit.map((e, i) => (
              <li key={i} className="text-sm"><span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-secondary" />
                <div className="font-mono text-[11px] text-muted-foreground">{new Date(e.at).toLocaleString()} · {e.actor}</div>{e.action}</li>
            ))}
          </ol>
        </Card>
      </div>
      <div className="space-y-6">
        <SellerProtectionCard sp={sp} />
        <Card title="Fraud risk score" icon={Scale}>
          <div className="flex items-end gap-2"><span className={`text-5xl font-extrabold ${risk < 35 ? "text-success" : risk < 65 ? "text-warning" : "text-destructive"}`}>{risk}</span><span className="pb-2 text-muted-foreground">/ 100</span></div>
          <div className="text-sm text-muted-foreground">{risk < 35 ? "Low — evidence supports legitimate activity" : risk < 65 ? "Moderate — review gaps" : "High — insufficient evidence"}</div>
        </Card>
        <Card title="Carrier verification" icon={Truck}>
          <div className="flex items-center gap-2 text-sm">
            {delivered ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
            {delivered ? (signed ? "Delivered · signature in supplied evidence" : "Delivered · signature missing") : hasManifest ? "In transit · no POD" : "No manifest provided"}
          </div>
          {track && <div className="mt-1 font-mono text-xs text-muted-foreground">UPS {track}</div>}
        </Card>
        <Card title="Adjudication" icon={ShieldCheck}>
          {decision ? (
            <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px]">{JSON.stringify(decision.api, null, 2)}</pre>
          ) : (
            <Button disabled={busy || !preflight.ready || autoPending} onClick={() => {
              if (!preflight.ready || autoPending) return;
              setBusy(true);
              setTimeout(() => {
                const txn = "REL-" + Math.random().toString(36).slice(2, 10).toUpperCase();
                const at = now();
                onApprove({ status: "approved", at, txn, api: { simulated: true, status: 200, endpoint: "POST /v1/risk/holds/PP-4821/release", hold_status: "RELEASED", release_id: txn, amount: { currency_code: "USD", value: "12500.00" }, balance_bucket: "AVAILABLE", released_at: at } });
              }, 1400);
            }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-success py-3 font-bold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Approve & Release Hold (demo)
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReceiptView({ docs, audit, decision, analysis, sp }: { docs: EvidenceDoc[]; audit: AuditEvent[]; decision: Decision; analysis: Analysis; sp: SP }) {
  const [sealHash, setSealHash] = useState("");
  const payload = useMemo(() => JSON.stringify({ case: "PP-4821", decision, seller_protection: { eligible: sp.eligible, rules: sp.rules.map((r) => ({ rule: r.label, pass: r.pass })) }, evidence: docs.map((d) => ({ name: d.name, kind: d.kind, sha256: d.hash })), audit, riskScore: analysis.riskScore }, null, 2), [docs, audit, decision, analysis, sp]);
  useEffect(() => { sha256Hex(new TextEncoder().encode(payload).buffer as ArrayBuffer).then(setSealHash); }, [payload]);
  if (!decision) return <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground"><Receipt className="mx-auto mb-2 h-6 w-6" />The certified receipt is issued once the demo case is approved.</div>;
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...JSON.parse(payload), receipt_seal_sha256: sealHash }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "resolution-receipt-PP-4821.json"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border bg-card shadow-sm">
      <div className="rounded-t-2xl bg-primary p-6 text-primary-foreground">
        <div className="text-xs uppercase tracking-widest opacity-70">Certified Resolution Receipt</div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2"><div className="text-2xl font-extrabold">Case #PP-4821</div><div className="text-3xl font-extrabold">$12,500.00 restored</div></div>
        <div className="mt-2 font-mono text-xs opacity-80">{decision.txn} · {new Date(decision.at).toLocaleString()}</div>
      </div>
      <div className="space-y-6 p-6">
        <div>
          <h3 className="mb-2 text-sm font-bold">Verified evidence hashes</h3>
          <table className="w-full text-xs"><tbody>
            {docs.map((d) => <tr key={d.id} className="border-b"><td className="py-1.5 pr-2 font-semibold">{d.name}</td><td className="break-all font-mono text-muted-foreground">{d.hash}</td></tr>)}
          </tbody></table>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">Decision log</h3>
          <ul className="space-y-1 text-xs">{audit.map((e, i) => <li key={i} className="flex gap-2"><span className="shrink-0 font-mono text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span><b className="shrink-0">{e.actor}</b><span>{e.action}</span></li>)}</ul>
        </div>
        <SellerProtectionCard sp={sp} compact />
        <div className="rounded-lg bg-success/10 p-3 text-sm"><CheckCircle2 className="mr-1 inline h-4 w-4 text-success" />Funds restored to available balance via PayPal Payments API (simulated).</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="min-w-0"><div className="text-xs text-muted-foreground">Receipt seal (SHA-256)</div><div className="break-all font-mono text-[11px]">{sealHash}</div></div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-lg border px-3 py-2 text-sm font-semibold">Print</button>
            <button onClick={download} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" />Export</button>
          </div>
        </div>
      </div>
    </div>
  );
}
