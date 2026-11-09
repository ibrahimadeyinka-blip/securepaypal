import { ArrowRight, CheckCircle2, FileText, GitCompareArrows, Minus, Truck, XCircle } from "lucide-react";
import type { evaluatePreflight } from "@/lib/preflight";

export function EvidenceComparison({ result }: { result: ReturnType<typeof evaluatePreflight> }) {
  return <section className="border-y py-6" aria-labelledby="comparison-title">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id="comparison-title" className="flex items-center gap-2 font-bold"><GitCompareArrows className="h-5 w-5 text-secondary" />3-Way Evidence Triangulation</h2>
      <span className="text-xs text-muted-foreground">Local text extraction · no live carrier lookup</span>
    </div>
    <div className="mb-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
      {["Purchase order", "Supplier invoice", "Carrier manifest"].map((name, i) => <div key={name} className="contents">
        {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
        <div className="flex min-w-0 flex-col items-center gap-2 border-b-2 border-secondary/40 py-3 text-xs font-semibold">{i === 2 ? <Truck className="h-6 w-6 text-secondary" /> : <FileText className="h-6 w-6 text-secondary" />}{name}</div>
      </div>)}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px] table-fixed text-left text-xs">
        <thead><tr className="border-b text-muted-foreground"><th className="w-[20%] py-3">Field</th><th className="w-[23%]">PO</th><th className="w-[23%]">Invoice</th><th className="w-[23%]">Carrier</th><th className="w-[11%]">Result</th></tr></thead>
        <tbody>{result.rows.map((row) => <tr key={row.id} className={`border-b ${row.status === "conflict" ? "bg-destructive/5 text-destructive" : ""}`}>
          <th scope="row" className="py-4 pr-3 align-top font-semibold">{row.label}</th>
          {(["po", "invoice", "manifest"] as const).map((kind) => <td key={kind} className="break-words py-4 pr-3 align-top">{row.values[kind] ?? <span className="text-muted-foreground">Not supplied</span>}</td>)}
          <td className="py-4 align-top"><span title={row.detail} className={`flex flex-col gap-1 ${row.status === "match" ? "text-success" : row.status === "conflict" || row.status === "missing" ? "text-destructive" : "text-muted-foreground"}`}>{row.status === "match" ? <CheckCircle2 className="h-4 w-4" /> : row.status === "conflict" || row.status === "missing" ? <XCircle className="h-4 w-4" /> : <Minus className="h-4 w-4" />}{row.status === "partial" ? "Unverified" : row.status}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}