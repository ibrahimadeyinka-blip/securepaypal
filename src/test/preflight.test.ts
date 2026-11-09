import { describe, expect, it } from "vitest";
import { compareEvidence, evaluatePreflight } from "@/lib/preflight";
import { SCENARIOS } from "@/lib/paypal";
import { guessKind, type EvidenceDoc, type DocKind } from "@/lib/resolve";

const doc = (kind: DocKind, original: string): EvidenceDoc => ({ id: kind, name: kind, kind, size: 1, hash: "x", uploadedAt: "", original, redacted: original, piiCount: 0 });
const scenarioDocs = (id: string) => (SCENARIOS.find((s) => s.id === id)?.samples ?? []).map((s) => doc(guessKind(s.name), s.text));
describe("live evidence gates", () => {
  it("allows a complete matching clean case to submit and auto-approve", () => {
    expect(evaluatePreflight(scenarioDocs("clean")).ready).toBe(true);
  });
  it("blocks incomplete evidence", () => {
    expect(evaluatePreflight(scenarioDocs("clean").filter((d) => d.kind !== "po")).ready).toBe(false);
  });
  it("blocks unsigned high-value delivery", () => {
    expect(evaluatePreflight(scenarioDocs("nosig"), 12500).ready).toBe(false);
  });
  it("blocks 45 invoiced units versus 50 ordered units", () => {
    const docs = scenarioDocs("clean").map((d) => d.kind === "invoice" ? { ...d, original: d.original.replace("Quantity: 500", "Quantity: 45") } : d.kind === "po" ? { ...d, original: d.original.replace("Qty: 500", "Qty: 50") } : d);
    const result = evaluatePreflight(docs);
    expect(result.ready).toBe(false);
    expect(result.rows.find((r) => r.id === "quantity")?.status).toBe("conflict");
  });
  it("detects a one-digit delivery postcode mismatch", () => {
    const docs = scenarioDocs("clean").map((d) => d.kind === "manifest" ? { ...d, original: d.original.replace("94105", "94106") } : d);
    expect(evaluatePreflight(docs).ready).toBe(false);
    expect(compareEvidence(docs).find((r) => r.id === "address")?.status).toBe("conflict");
  });
  it("blocks 50 lb ordered versus 2 lb delivered", () => {
    const docs = scenarioDocs("clean").map((d) => ({ ...d, original: d.original + (d.kind === "po" ? "\nWeight: 50 lbs" : d.kind === "manifest" ? "\nDelivered weight: 2 lbs" : "") }));
    expect(evaluatePreflight(docs).ready).toBe(false);
    expect(compareEvidence(docs).find((r) => r.id === "weight")?.status).toBe("conflict");
  });
  it("does not invent optional fields", () => {
    expect(compareEvidence([doc("invoice", "Item: Mug")]).find((r) => r.id === "weight")?.status).toBe("partial");
  });
  it("rejects unreadable binary evidence", () => {
    const docs = [...scenarioDocs("clean"), doc("invoice", "[binary application/pdf — text extraction unavailable]")];
    expect(evaluatePreflight(docs).ready).toBe(false);
  });
  it("normalizes kg and lb measurements", () => {
    expect(compareEvidence([doc("po", "Weight: 1 kg"), doc("manifest", "Weight: 2.2046226218 lbs")]).find((r) => r.id === "weight")?.status).toBe("match");
  });
});