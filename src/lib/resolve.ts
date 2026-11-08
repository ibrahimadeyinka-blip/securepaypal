export type DocKind = "invoice" | "po" | "manifest";

export type EvidenceDoc = {
  id: string;
  name: string;
  kind: DocKind;
  size: number;
  hash: string;
  uploadedAt: string;
  original: string;
  redacted: string;
  piiCount: number;
};

export type AuditEvent = { at: string; actor: string; action: string; hash?: string | undefined };

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(d))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const PII: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]"],
  [/\b(?:\d[ -]?){13,16}\b/g, "[CARD]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"],
  [/\+?\d{1,2}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[PHONE]"],
];

export function redactPII(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const [re, tag] of PII) {
    out = out.replace(re, () => {
      count++;
      return tag;
    });
  }
  return { text: out, count };
}

export function guessKind(name: string): DocKind {
  const n = name.toLowerCase();
  if (/(po|purchase|order)/.test(n)) return "po";
  if (/(manifest|ship|carrier|bol|track)/.test(n)) return "manifest";
  return "invoice";
}

export type Finding = { severity: "high" | "medium" | "ok"; title: string; detail: string };

function qty(text: string): number | null {
  const m = text.match(/(?:qty|quantity|units)\s*[:=]?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

export function analyzeGaps(docs: EvidenceDoc[]) {
  const findings: Finding[] = [];
  const by = (k: DocKind) => docs.filter((d) => d.kind === k);
  const [inv, po, man] = [by("invoice"), by("po"), by("manifest")];

  if (!inv.length) findings.push({ severity: "high", title: "Missing supplier invoice", detail: "Upload the supplier invoice proving inventory acquisition." });
  if (!po.length) findings.push({ severity: "medium", title: "Missing wholesale PO", detail: "A buyer purchase order explains the sales volume spike." });
  if (!man.length) findings.push({ severity: "high", title: "No delivery confirmation", detail: "Carrier manifest with tracking numbers is required to verify fulfillment." });
  else if (!man.some((d) => /deliver|signed|POD/i.test(d.original)))
    findings.push({ severity: "medium", title: "Delivery not confirmed", detail: "Manifest lists shipments but no proof-of-delivery signature." });

  const qi = inv.map((d) => qty(d.original)).find((q) => q != null);
  const qp = po.map((d) => qty(d.original)).find((q) => q != null);
  if (qi != null && qp != null && qi !== qp)
    findings.push({ severity: "high", title: "Quantity mismatch", detail: `Invoice shows ${qi} units, PO shows ${qp} units.` });
  else if (qi != null && qp != null)
    findings.push({ severity: "ok", title: "Quantities reconcile", detail: `Invoice and PO both list ${qi} units.` });

  if (inv.length && po.length && man.length && !findings.some((f) => f.severity === "high"))
    findings.push({ severity: "ok", title: "Evidence chain complete", detail: "Supply → sale → fulfillment is documented end-to-end." });

  const high = findings.filter((f) => f.severity === "high").length;
  const med = findings.filter((f) => f.severity === "medium").length;
  const readiness = Math.max(0, Math.min(100, 100 - high * 30 - med * 12 - (docs.length ? 0 : 20)));
  const riskScore = Math.max(4, Math.min(96, 82 - docs.length * 9 + high * 14 + med * 5));

  const summary = [
    `Merchant reports the $12,500 velocity spike on Case #PP-4821 results from a bulk wholesale order.`,
    inv.length ? `Supplier invoice(s) (${inv.length}) establish legitimate inventory sourcing.` : `No supplier invoice has been provided.`,
    po.length ? `Wholesale PO(s) (${po.length}) substantiate the transaction volume.` : `No wholesale PO substantiates volume.`,
    man.length ? `Carrier manifest(s) (${man.length}) document fulfillment.` : `Fulfillment is not yet documented.`,
    `All ${docs.length} artifacts are SHA-256 sealed and PII-redacted before submission.`,
  ].join(" ");

  return { findings, readiness, riskScore, summary };
}

export const SAMPLES: { name: string; text: string }[] = [
  { name: "supplier_invoice_ACME-2291.txt", text: "ACME Wholesale Supply\nInvoice #2291\nBill to: jane.merchant@shopmail.com\nPhone: (415) 555-0199\nItem: Ceramic Mug Set\nQuantity: 500\nTotal: $6,250.00\nPaid via card 4111 1111 1111 1111" },
  { name: "wholesale_PO_BrightRetail.txt", text: "Bright Retail Co. Purchase Order PO-7781\nContact: buyer@brightretail.com\nItem: Ceramic Mug Set\nQty: 500\nUnit price: $25.00\nTotal: $12,500.00" },
  { name: "carrier_manifest_UPS.txt", text: "UPS Freight Manifest\nTracking: 1Z999AA10123456784\nPieces: 20 pallets\nStatus: Delivered - signed by R. Okafor\nPOD captured 2026-11-05" },
];

export const now = () => new Date().toISOString();
