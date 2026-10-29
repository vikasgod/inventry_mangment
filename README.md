# Inventory CRM — Next.js + TypeScript + MongoDB

This project is a multi-channel inventory CRM foundation for one business: website, Amazon, Flipkart and Meesho. It includes a dashboard UI, product CRUD, multiple image upload (Cloudinary), inventory adjustment/read APIs, channel listing and price-rule models, sync-job tracking, a BullMQ worker scaffold, and channel adapter interfaces.

## Requirements
- Node.js 20+
- MongoDB (local or Atlas)
- Redis for background sync worker
- Cloudinary account for product image upload

## Install and run (Windows PowerShell)
1. Extract the ZIP.
2. Open the `inventory-crm` folder in VS Code.
3. Copy `.env.example` to `.env.local`.
4. Fill in `MONGODB_URI` and Cloudinary credentials. Redis is needed for queue/worker functionality.
5. Run `npm install`.
6. Run `npm run dev` and open http://localhost:3000.
7. Start Redis and run `npm run worker` in a second terminal for sync jobs.

## Product images
- The product form accepts up to 10 images, maximum 5 MB each.
- Images are uploaded server-side to Cloudinary; their URLs are stored in MongoDB.
- Never expose Cloudinary API secret in `NEXT_PUBLIC_` variables.

## Included routes
- `GET/POST /api/products` — list/create products; create supports multipart image upload.
- `GET/PATCH/DELETE /api/products/:id` — product operations.
- `GET /api/inventory` and `POST /api/inventory/adjust` — inventory.
- `GET /api/listings` — channel listing state.
- `POST /api/pricing/preview` and `/api/pricing/apply` — channel price rules.
- `GET /api/sync-jobs` and `POST /api/sync-jobs/:id/retry` — sync job management.

## Phase status and production boundary
- Phase 1: product and inventory foundation — starter APIs and UI included; review stock transactions before production.
- Phase 2: website storefront, payment processing, full order lifecycle — not complete in this CRM dashboard starter.
- Phase 3: queue, pricing, sync tracking and adapter scaffold — included as foundation.
- Phase 4: Amazon and Flipkart — real API adapters are not enabled; configure authorized seller API access and implement/validate provider-specific payloads before live use.
- Phase 5: Meesho — adapter access is account/partner dependent; default is manual/partner-required, not live API sync.

The Amazon, Flipkart and Meesho adapters in this starter do not claim to publish live listings. No marketplace credentials are included. This ZIP is a starter implementation, not a production-certified integration. Add authentication/RBAC, transaction-safe reservation workflows, signed webhook validation, idempotent order import, provider-specific API mappers, tests, monitoring and backups before handling real orders.
