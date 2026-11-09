import type { EvidenceDoc } from "./resolve";

export const CASE_ID = "PP-D-4821";
export const ORDER_ID = "5O190127TN364715T";
export const CAPTURE_ID = "3C679366HH908993F";
export const AMOUNT = 12500;

export type ScenarioId = "clean" | "mismatch" | "nosig";
export type Scenario = { id: ScenarioId; label: string; tagline: string; samples: { name: string; text: string }[] };

const INVOICE = (q: number) =>
  `ACME Wholesale Supply\nInvoice #2291\nBill to: jane.merchant@shopmail.com\nPhone: (415) 555-0199\nItem: Ceramic Mug Set (physical goods)\nQuantity: ${q}\nTotal: $6,250.00\nPaid via card 4111 1111 1111 1111`;
const PO = (q: number) =>
  `Bright Retail Co. Purchase Order PO-7781\nContact: buyer@brightretail.com\nShip to: 220 Market St, San Francisco CA 94105\nItem: Ceramic Mug Set\nQty: ${q}\nUnit price: $25.00\nTotal: $12,500.00`;

export const SCENARIOS: Scenario[] = [
  {
    id: "clean",
    label: "Clean wholesale spike",
    tagline: "Invoice, PO and signed delivery all match",
    samples: [
      { name: "supplier_invoice_ACME-2291.txt", text: INVOICE(500) },
      { name: "wholesale_PO_BrightRetail.txt", text: PO(500) },
      { name: "carrier_manifest_UPS.txt", text: "UPS Freight Manifest\nTracking: 1Z999AA10123456784\nDeliver to: 220 Market St, San Francisco CA 94105\nPieces: 20 pallets\nStatus: Delivered - signed by R. Okafor\nPOD captured 2026-11-05" },
    ],
  },
  {
    id: "mismatch",
    label: "Quantity mismatch",
    tagline: "PO says 100 units, invoice says 500",
    samples: [
      { name: "supplier_invoice_ACME-2291.txt", text: INVOICE(500) },
      { name: "wholesale_PO_BrightRetail.txt", text: PO(100) },
      { name: "carrier_manifest_UPS.txt", text: "UPS Freight Manifest\nTracking: 1Z999AA10123456784\nDeliver to: 88 Harbor Rd, Newark NJ 07114\nPieces: 4 pallets\nStatus: Delivered - signed by T. Wells\nPOD captured 2026-11-05" },
    ],
  },
  {
    id: "nosig",
    label: "No signature on delivery",
    tagline: "Delivered, but over $750 with no signature",
    samples: [
      { name: "supplier_invoice_ACME-2291.txt", text: INVOICE(500) },
      { name: "wholesale_PO_BrightRetail.txt", text: PO(500) },
      { name: "carrier_manifest_UPS.txt", text: "UPS Freight Manifest\nTracking: 1Z999AA10123456784\nDeliver to: 220 Market St, San Francisco CA 94105\nPieces: 20 pallets\nStatus: Delivered - left at loading dock\nNo signature captured" },
    ],
  },
];

export type Rule = { id: string; label: string; pass: boolean; detail: string };

/** PayPal Seller Protection (Item Not Received) eligibility, simplified. */
export function sellerProtection(docs: EvidenceDoc[], amount = AMOUNT) {
  const all = docs.map((d) => d.original).join("\n");
  const man = docs.filter((d) => d.kind === "manifest").map((d) => d.original).join("\n");
  const tracking = all.match(/\b(1Z[0-9A-Z]{16}|\d{12,22})\b/)?.[0];
  const tangible = docs.some((d) => d.kind === "invoice") && !/digital|license|download/i.test(all);
   const delivered = /\bdelivered\b/i.test(man) && !/not delivered|undelivered/i.test(man);
  const signed = /signed by|signature confirm/i.test(man) && !/no signature/i.test(man);
  const shipTo = all.match(/Ship to:\s*(.+)/i)?.[1]?.trim();
  const deliverTo = man.match(/Deliver to:\s*(.+)/i)?.[1]?.trim();
   const normalizeAddress = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
   const addressOk = !!shipTo && !!deliverTo && normalizeAddress(shipTo) === normalizeAddress(deliverTo);
  const needsSig = amount >= 750;
  const rules: Rule[] = [
    { id: "tangible", label: "Physical, tangible item", pass: tangible, detail: tangible ? "Supplier invoice lists physical goods" : "No invoice proving a physical item" },
    { id: "tracking", label: "Online tracking number", pass: !!tracking, detail: tracking ? `Carrier tracking ${tracking}` : "No carrier tracking found" },
    { id: "delivered", label: "Delivered status", pass: delivered, detail: delivered ? "Carrier shows delivered" : "No proof of delivery" },
     { id: "address", label: "Shipped to buyer's address", pass: addressOk, detail: addressOk ? "Delivery address matches the supplied PO; PayPal transaction address not independently verified" : !shipTo || !deliverTo ? "Supply both the PO shipping address and carrier delivery address" : `Order ships to ${shipTo}, carrier delivered to ${deliverTo}` },
     { id: "signature", label: `Signature confirmation (orders ≥ $750)`, pass: !needsSig || signed, detail: signed ? "Recipient signature recorded in supplied evidence; not independently verified" : needsSig ? `$${amount.toLocaleString()} order: missing signature confirmation. Upload carrier evidence of a recipient signature before submitting.` : "Not required" },
  ];
  const eligible = rules.every((r) => r.pass);
  return { eligible, rules, tracking };
}

export type ApiEvent = {
  id: string;
  at: string;
  type: "webhook" | "request";
  name: string;
  method?: "GET" | "POST";
  status?: number;
  payload: unknown;
};

const rid = () => crypto.randomUUID();
const amt = (v = AMOUNT) => ({ currency_code: "USD", value: v.toFixed(2) });

export function evOrderCompleted(at: string): ApiEvent {
  return {
    id: rid(), at, type: "webhook", name: "CHECKOUT.ORDER.COMPLETED",
    payload: {
      id: "WH-" + rid().slice(0, 17).toUpperCase(), event_version: "1.0", create_time: at, resource_type: "checkout-order", resource_version: "2.0",
      event_type: "CHECKOUT.ORDER.COMPLETED", summary: "Checkout Order Completed",
      resource: { id: ORDER_ID, intent: "CAPTURE", status: "COMPLETED", purchase_units: [{ reference_id: "PO-7781", amount: amt(), payee: { merchant_id: "7KNGBPH2U58GQ" }, payments: { captures: [{ id: CAPTURE_ID, status: "COMPLETED", amount: amt(), final_capture: true, seller_protection: { status: "PENDING_REVIEW", dispute_categories: ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"] } }] } }] },
    },
  };
}

export function evRiskHold(at: string): ApiEvent {
  return {
    id: rid(), at, type: "webhook", name: "RISK.DISPUTE.CREATED",
    payload: {
      id: "WH-" + rid().slice(0, 17).toUpperCase(), event_version: "1.0", create_time: at, resource_type: "dispute", event_type: "RISK.DISPUTE.CREATED",
      summary: "A risk dispute / reserve hold was created",
      resource: { dispute_id: CASE_ID, create_time: at, reason: "UNAUTHORIZED", status: "WAITING_FOR_SELLER_RESPONSE", dispute_life_cycle_stage: "INQUIRY", dispute_channel: "INTERNAL",
        disputed_transactions: [{ seller_transaction_id: CAPTURE_ID, gross_amount: amt() }], dispute_amount: amt(),
        seller_response_due_date: new Date(Date.now() + 72 * 3600e3).toISOString(),
        risk_signals: { model: "velocity_v4", velocity_multiple: 7.4, new_buyer: true, hold_type: "PAYMENT_RESERVE" } },
    },
  };
}

export function evProvideEvidence(at: string, docs: EvidenceDoc[], tracking?: string): ApiEvent {
  return {
    id: rid(), at, type: "request", name: `/v1/customer/disputes/${CASE_ID}/provide-evidence`, method: "POST", status: 200,
    payload: {
      request: {
        headers: { "Content-Type": "multipart/related", Authorization: "Bearer A21AA…", "PayPal-Request-Id": rid() },
        input: {
          evidences: [
            ...(tracking ? [{ evidence_type: "PROOF_OF_FULFILLMENT", evidence_info: { tracking_info: [{ carrier_name: "UPS", tracking_number: tracking }] }, notes: "Signed POD attached" }] : []),
            { evidence_type: "OTHER", documents: docs.map((d) => ({ name: d.name, sha256: d.hash, pii_redacted: d.piiCount })), notes: "Supplier invoice + wholesale PO substantiate volume" },
          ],
        },
      },
      response: { links: [{ href: `https://api-m.paypal.com/v1/customer/disputes/${CASE_ID}`, rel: "self", method: "GET" }] },
    },
  };
}

export function evDisputeUpdated(at: string): ApiEvent {
  return { id: rid(), at, type: "webhook", name: "CUSTOMER.DISPUTE.UPDATED", payload: { event_type: "CUSTOMER.DISPUTE.UPDATED", create_time: at, resource: { dispute_id: CASE_ID, status: "UNDER_REVIEW", dispute_life_cycle_stage: "INQUIRY" } } };
}

export function evRelease(at: string, txn: string): ApiEvent {
  return {
    id: rid(), at, type: "request", name: `/v1/customer/disputes/${CASE_ID}/adjudicate`, method: "POST", status: 200,
    payload: { request: { adjudication_type: "SELLER_FAVOR", note: "Evidence chain verified by ResolveAI" }, response: { release_id: txn, hold_status: "RELEASED", amount: amt(), balance_bucket: "AVAILABLE", released_at: at } },
  };
}

export function evResolved(at: string, eligible: boolean): ApiEvent {
  return {
    id: rid(), at, type: "webhook", name: "CUSTOMER.DISPUTE.RESOLVED",
    payload: { event_type: "CUSTOMER.DISPUTE.RESOLVED", create_time: at, resource_type: "dispute", resource: { dispute_id: CASE_ID, status: "RESOLVED", dispute_outcome: { outcome_code: "RESOLVED_SELLER_FAVOUR", amount_refunded: amt(0) }, seller_protection_eligible: eligible, disputed_transactions: [{ seller_transaction_id: CAPTURE_ID, seller_protection_eligible: eligible }] } },
  };
}
