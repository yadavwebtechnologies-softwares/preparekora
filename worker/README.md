# PrepareKora API — Cloudflare Worker

Backend for PrepareKora.in. Uses Cloudflare KV + Workers AI + JWT.
No secrets in this repository. All credentials live in Cloudflare env secrets.

---

## Prerequisites

- Node.js 18+ (for `wrangler`)
- A Cloudflare account (free plan works)
- Terminal

---

## One-time setup

### 1. Install dependencies

```bash
cd worker
npm install
