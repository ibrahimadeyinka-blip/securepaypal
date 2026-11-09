import { describe, it, expect } from "vitest";
import { sellerProtection } from "@/lib/paypal";
import type { EvidenceDoc, DocKind } from "@/lib/resolve";

const doc = (kind: DocKind, original: string): EvidenceDoc => ({ id: kind, name: kind, kind, size: 1, hash: "x", uploadedAt: "", original, redacted: original, piiCount: 0 });
const inv = doc("invoice", "Item: Mug Set");
const unsigned = doc("manifest", "Tracking: 1Z999AA10123456784\nDeliver to: 220 Market St\nStatus: Delivered - left at dock\nNo signature captured");
const po = doc("po", "Ship to: 220 Market St");

describe("seller protection", () => {
  it("requires a signature for orders of $750 or more", () => {
    expect(sellerProtection([inv, po, unsigned], 750).eligible).toBe(false);
  });
  it("does not require a signature under $750", () => {
    expect(sellerProtection([inv, po, unsigned], 749).eligible).toBe(true);
  });
  it("does not treat absent addresses as a match", () => {
    expect(sellerProtection([inv, unsigned], 749).rules.find((r) => r.id === "address")?.pass).toBe(false);
  });
});
