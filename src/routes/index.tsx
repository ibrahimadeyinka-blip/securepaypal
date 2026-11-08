import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ShieldCheck, Upload, FileText, Hash, Sparkles, CheckCircle2, XCircle,
  Truck, Clock, Download, Store, Scale, Lock, Eye, EyeOff, Loader2, Receipt,
} from "lucide-react";
import {
  analyzeGaps, guessKind, now, redactPII, sha256Hex, SAMPLES,
  type AuditEvent, type EvidenceDoc, type DocKind,
} from "@/lib/resolve";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PayPal ResolveAI — Dispute & Hold Resolution" },
      { name: "description", content: "Merchants submit sealed evidence, AI finds gaps, analysts release holds in one click." },
      { property: "og:title", content: "PayPal ResolveAI — Dispute & Hold Resolution" },
      { property: "og:description", content: "AI-powered evidence analysis and certified resolution receipts for PayPal account holds." },
    ],
  }),
  component: App,
});

type View = "merchant" | "analyst" | "receipt";
type Decision = { status: "approved"; at: string; txn: string; api: object } | null;

const KIND_LABEL: Record<DocKind, string> = { invoice: "Supplier invoice", po: "Wholesale PO", manifest: "Carrier manifest" };
const HOLD_DEADLINE = Date.now() + 1000 * 60 * 60 * 71 + 1000 * 60 * 23;

function App() {
  const [view, setView] = useState<View>("merchant");
  const [docs, setDocs] = useState<EvidenceDoc[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([
    { at: now(), actor: "PayPal Risk Engine", action: "Hold placed on $12,500.00 — velocity anomaly (7.4× 30-day avg)" },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const log = (actor: string, action: string, hash?: string) =>
    setAudit((a) => [...a, { at: now(), actor, action, hash }]);
  const analysis = useMemo(() => analyzeGaps(docs), [docs]);

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <div className="text-lg font-extrabold tracking-tight">PayPal ResolveAI</div>
              <div className="text-xs opacity-70">Maker–Checker hold resolution</div>
            </div>
          </div>
          <nav className="flex rounded-lg bg-primary-foreground/10 p-1 text-sm font-semibold">
            {([
              ["merchant", "Merchant", Store],
              ["analyst", "Compliance Analyst", Scale],
              ["receipt", "Receipt", Receipt],
            ] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${view === v ? "bg-primary-foreground text-primary" : "hover:bg-primary-foreground/10"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {view === "merchant" && (
          <Merchant docs={docs} setDocs={setDocs} log={log} analysis={analysis}
            submitted={submitted} decision={decision}
            onSubmit={() => { setSubmitted(true); log("Merchant", `Defense packet submitted (${docs.length} artifacts, readiness ${analysis.readiness}%)`); }} />
        )}
        {view === "analyst" && (
          <Analyst docs={docs} analysis={analysis} audit={audit} submitted={submitted} decision={decision}
            onApprove={(d) => { setDecision(d); log("Analyst · K. Mensah", `Approved & released hold — ${d.txn}`); log("PayPal Payments API", "Reserve released: $12,500.00 restored to available balance"); }} />
        )}
        {view === "receipt" && <ReceiptView docs={docs} audit={audit} decision={decision} analysis={analysis} />}
      </main>
    </div>
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
  const [t, setT] = useState(HOLD_DEADLINE - Date.now());
  useEffect(() => { const i = setInterval(() => setT(HOLD_DEADLINE - Date.now()), 1000); return () => clearInterval(i); }, []);
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

function Merchant({ docs, setDocs, log, analysis, submitted, onSubmit, decision }: {
  docs: EvidenceDoc[]; setDocs: React.Dispatch<React.SetStateAction<EvidenceDoc[]>>;
  log: (a: string, b: string, h?: string) => void; analysis: Analysis; submitted: boolean; onSubmit: () => void; decision: Decision;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);

  async function add(name: string, buf: ArrayBuffer, text: string) {
    const hash = await sha256Hex(buf);
    const { text: redacted, count } = redactPII(text);
    const d: EvidenceDoc = { id: crypto.randomUUID(), name, kind: guessKind(name), size: buf.byteLength, hash, uploadedAt: now(), original: text, redacted, piiCount: count };
    setDocs((x) => [...x, d]);
    setPreview(d.id);
    setRan(false);
    log("Merchant", `Uploaded ${name} · ${count} PII fields redacted`, hash);
  }
  async function onFiles(files: FileList | null) {
    for (const f of Array.from(files ?? [])) {
      const buf = await f.arrayBuffer();
      const text = /text|json|csv/.test(f.type) || /\.(txt|csv|json)$/i.test(f.name) ? new TextDecoder().decode(buf) : `[binary ${f.type || "file"} — ${f.size} bytes, text extraction unavailable]`;
      await add(f.name, buf, text);
    }
  }
  async function loadSamples() {
    for (const s of SAMPLES) if (!docs.some((d) => d.name === s.name)) await add(s.name, new TextEncoder().encode(s.text).buffer as ArrayBuffer, s.text);
  }
  const p = docs.find((d) => d.id === preview);

  return (
    <>
      <HoldBanner released={!!decision} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Secure evidence upload" icon={Lock} right={<button onClick={loadSamples} className="text-xs font-semibold text-secondary hover:underline">Load sample documents</button>}>
            <button onClick={() => input.current?.click()} disabled={submitted}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-secondary/40 bg-accent/40 p-8 text-center transition hover:bg-accent disabled:opacity-50">
              <Upload className="h-6 w-6 text-secondary" />
              <span className="font-semibold">Drop supplier invoices, wholesale POs, carrier manifests</span>
              <span className="text-xs text-muted-foreground">Hashed with SHA-256 & PII-redacted in your browser before anything leaves your device</span>
            </button>
            <input ref={input} type="file" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            <ul className="mt-4 divide-y">
              {docs.map((d) => (
                <li key={d.id} className={`flex cursor-pointer items-center gap-3 py-2.5 ${preview === d.id ? "text-secondary" : ""}`} onClick={() => setPreview(d.id)}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">sha256:{d.hash}</div>
                  </div>
                  <select value={d.kind} onClick={(e) => e.stopPropagation()} onChange={(e) => setDocs((x) => x.map((y) => y.id === d.id ? { ...y, kind: e.target.value as DocKind } : y))}
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
        <div className="lg:col-span-2">
          <Card title="AI Gap Analyzer · Pre-flight" icon={Sparkles}>
            <button disabled={!docs.length || running} onClick={() => { setRunning(true); setTimeout(() => { setRunning(false); setRan(true); log("ResolveAI", `Gap analysis run · readiness ${analysis.readiness}%`); }, 1200); }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 font-semibold text-secondary-foreground disabled:opacity-50">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Run pre-flight check
            </button>
            {ran && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">Case readiness</span><span className="font-mono">{analysis.readiness}%</span></div>
                  <div className="h-2 rounded bg-muted"><div className={`h-2 rounded ${analysis.readiness >= 80 ? "bg-success" : "bg-warning"}`} style={{ width: `${analysis.readiness}%` }} /></div>
                </div>
                <ul className="space-y-2">
                  {analysis.findings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      {f.severity === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : f.severity === "high" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
                      <div><div className="font-semibold">{f.title}</div><div className="text-muted-foreground">{f.detail}</div></div>
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-accent p-3 text-sm"><div className="mb-1 text-xs font-bold uppercase text-accent-foreground">Generated defense summary</div>{analysis.summary}</div>
                <button disabled={submitted} onClick={onSubmit} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
                  {submitted ? "Submitted to PayPal Compliance ✓" : "Submit defense packet"}
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Analyst({ docs, analysis, audit, submitted, decision, onApprove }: {
  docs: EvidenceDoc[]; analysis: Analysis; audit: AuditEvent[]; submitted: boolean; decision: Decision; onApprove: (d: NonNullable<Decision>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const hasManifest = docs.some((d) => d.kind === "manifest");
  const delivered = docs.some((d) => d.kind === "manifest" && /deliver|signed|POD/i.test(d.original));
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
        <Card title="Fraud risk score" icon={Scale}>
          <div className="flex items-end gap-2"><span className={`text-5xl font-extrabold ${risk < 35 ? "text-success" : risk < 65 ? "text-warning" : "text-destructive"}`}>{risk}</span><span className="pb-2 text-muted-foreground">/ 100</span></div>
          <div className="text-sm text-muted-foreground">{risk < 35 ? "Low — evidence supports legitimate activity" : risk < 65 ? "Moderate — review gaps" : "High — insufficient evidence"}</div>
        </Card>
        <Card title="Carrier verification" icon={Truck}>
          <div className="flex items-center gap-2 text-sm">
            {delivered ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
            {delivered ? "Delivered · POD signature verified" : hasManifest ? "In transit · no POD" : "No manifest provided"}
          </div>
          {track && <div className="mt-1 font-mono text-xs text-muted-foreground">UPS {track}</div>}
        </Card>
        <Card title="Adjudication" icon={ShieldCheck}>
          {decision ? (
            <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px]">{JSON.stringify(decision.api, null, 2)}</pre>
          ) : (
            <button disabled={busy} onClick={() => {
              setBusy(true);
              setTimeout(() => {
                const txn = "REL-" + Math.random().toString(36).slice(2, 10).toUpperCase();
                const at = now();
                onApprove({ status: "approved", at, txn, api: { status: 200, endpoint: "POST /v1/risk/holds/PP-4821/release", hold_status: "RELEASED", release_id: txn, amount: { currency_code: "USD", value: "12500.00" }, balance_bucket: "AVAILABLE", released_at: at } });
              }, 1400);
            }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-success py-3 font-bold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Approve & Release Hold
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReceiptView({ docs, audit, decision, analysis }: { docs: EvidenceDoc[]; audit: AuditEvent[]; decision: Decision; analysis: Analysis }) {
  const [sealHash, setSealHash] = useState("");
  const payload = useMemo(() => JSON.stringify({ case: "PP-4821", decision, evidence: docs.map((d) => ({ name: d.name, kind: d.kind, sha256: d.hash })), audit, riskScore: analysis.riskScore }, null, 2), [docs, audit, decision, analysis]);
  useEffect(() => { sha256Hex(new TextEncoder().encode(payload).buffer as ArrayBuffer).then(setSealHash); }, [payload]);
  if (!decision) return <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground"><Receipt className="mx-auto mb-2 h-6 w-6" />The certified receipt is issued once an analyst approves the case.</div>;
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
