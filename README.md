# Securepaypal

Create PayPal ResolveAI: an AI-powered dispute and account hold resolution platform for a PayPal AI hackathon.

Key features and user journey:
1. Merchant Dashboard (The Maker):
- Active Hold Alert banner (e.g., Case #PP-4821: $12,500 held due to velocity anomaly with countdown timer and plain-language reason for the flag).
- Secure evidence upload portal for supplier invoices, wholesale POs, and carrier manifests, featuring client-side PII redaction preview and tamper-proof SHA-256 hash audit trail.
- AI Gap Analyzer & Pre-Flight Check: analyzes uploaded documents, detects discrepancies (such as quantity mismatches or missing delivery confirmation), and generates a structured defense summary.

2. Risk Analyst Reviewer Dashboard (The Checker):
- Toggle/switcher between Merchant and PayPal Compliance Analyst views.
- Adjudication panel showing synthesized evidence brief, fraud risk score, carrier verification status, and risk timeline.
- One-click 'Approve & Release Hold' workflow with simulated PayPal API response releasing reserved funds.

3. Certified Resolution Receipt:
- Interactive audit trail and exportable resolution receipt showing timestamps, verified hashes, decision logs, and fund restoration confirmation.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://securepaypal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0d420607-e455-4fde-9b96-39e05355d247).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
