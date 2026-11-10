import type { DocKind, EvidenceDoc } from "./resolve";
import { AMOUNT, sellerProtection } from "./paypal";

export type EvidenceField = "quantity" | "address" | "tracking" | "weight" | "sku";
export type ComparisonRow = { id: EvidenceField; label: string; values: Record<DocKind, string | null>; status: "match" | "conflict" | "missing" | "partial"; detail: string };
const kinds: DocKind[] = ["po", "invoice", "manifest"];
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function extractEvidence(text: string): Record<EvidenceField, string | null> {
  const quantity = text.match(/(?:qty|quantity|units)\s*[:=]?\s*(\d+)/i)?.[1] ?? null;
  const address = text.match(/(?:ship to|deliver to|delivery address|shipping address)\s*:\s*([^\n\r]+)/i)?.[1]?.trim() ?? null;
  const tracking = text.match(/(?:tracking(?: number)?\s*:\s*)([a-z0-9 -]+)/i)?.[1]?.trim() ?? null;
  const weight = text.match(/(?:total\s+|shipment\s+|delivered\s+)?weight\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|pounds|kilograms)\b/i);
  const weightValue = weight ? `${Number(weight[1]) * (/^k/i.test((weight[2] ?? "")) ? 2.2046226218 : 1)}` : null;
  const sku = text.match(/(?:sku|product code)\s*[:=]\s*([^\n\r]+)/i)?.[1]?.trim() ?? null;
  return { quantity, address, tracking, weight: weightValue, sku };
}

export function compareEvidence(docs: EvidenceDoc[]): ComparisonRow[] {
  const labels: Record<EvidenceField, string> = { quantity: "Unit quantity", address: "Shipping address", tracking: "Tracking number", weight: "Shipment weight", sku: "Product SKU" };
  return (Object.keys(labels) as EvidenceField[]).map((id) => {
    const entries = kinds.map((kind) => docs.filter((d) => d.kind === kind).map((d) => extractEvidence(d.original)[id]).filter((v): v is string => v !== null));
    const [poE = [], invE = [], manE = []] = entries;
    const all = entries.flat();
    const unique = new Set(all.map((v) => id === "weight" ? Number(v).toFixed(2) : normalize(v)));
    const requiredMissing = id === "quantity" ? !poE.length || !invE.length : id === "address" ? !poE.length || !manE.length : id === "tracking" ? !manE.length : false;
    const status = unique.size > 1 ? "conflict" : requiredMissing ? "missing" : all.length >= 2 ? "match" : "partial";
    const values = Object.fromEntries(kinds.map((kind, i) => [kind, entries[i]?.length ? entries[i]!.map((v) => id === "weight" ? `${Number(v).toFixed(2)} lb` : v).join(" / ") : null])) as Record<DocKind, string | null>;
    const detail = id === "quantity" && status === "conflict" ? `Supplier invoice lists ${values.invoice ?? "unknown"} units; wholesale PO requests ${values.po ?? "unknown"}. Correct the documents or attach supporting backorder evidence for review.` : status === "conflict" ? `Conflicting ${labels[id].toLowerCase()} values. Correct or replace the evidence before submitting.` : status === "missing" ? `Add the missing ${labels[id].toLowerCase()} to the required evidence.` : status === "match" ? "Extracted values agree across the supplied documents." : "Not cross-verified — fewer than two documents supply this field.";
    return { id, label: labels[id], values, status, detail };
  });
}

export function evaluatePreflight(docs: EvidenceDoc[], amount = AMOUNT) {
  const rows = compareEvidence(docs);
  const sp = sellerProtection(docs, amount);
  const checks = [
    ...kinds.map((kind) => ({ id: kind, pass: docs.some((d) => d.kind === kind), label: { po: "Wholesale purchase order", invoice: "Supplier invoice", manifest: "Carrier delivery evidence" }[kind], detail: `Attach readable ${kind === "po" ? "purchase order" : kind === "invoice" ? "supplier invoice" : "carrier delivery"} evidence.` })),
    { id: "readable", pass: docs.length > 0 && docs.every((d) => !d.original.startsWith("[binary") && d.original.trim().length > 0), label: "Readable document text", detail: "Text extraction is unavailable for this file. Upload a TXT, CSV or JSON transcription; binary documents cannot be verified." },
    ...sp.rules,
    ...rows.filter((r) => r.id === "quantity" || r.status === "conflict").map((r) => ({ id: `comparison-${r.id}`, pass: r.status === "match", label: `${r.label} reconciliation`, detail: r.detail })),
  ];
  const blockers = checks.filter((c) => !c.pass);
  return { rows, checks, blockers, ready: blockers.length === 0, readiness: Math.round(checks.filter((c) => c.pass).length / checks.length * 100) };
}