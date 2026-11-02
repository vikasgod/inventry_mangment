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
4. Fill in `MONGODB_URI`, `SESSION_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Cloudinary credentials are needed only for product image uploads; Redis is needed for queue/worker functionality.
5. Run `npm install`.
6. Run `npm run dev` and open http://localhost:3000.
7. Start Redis and run `npm run worker` in a second terminal for sync jobs.

## Sign-in and operator access
- Set `SESSION_SECRET` to a unique random value of at least 32 characters, and configure `ADMIN_USERNAME` and `ADMIN_PASSWORD` before starting the app. The first login with those credentials creates the initial admin if none exists; there are no built-in credentials.
- App pages and management APIs require login. Customer order placement through `POST /api/orders` is public so a customer or storefront can submit an order without an admin/operator session; reading orders and updating their status remains protected. Sessions are stored in signed, HTTP-only cookies.
- There is no public signup. An admin can create operator accounts from **Operator accounts** and choose which sections each account may access. Admins always have access to every section. Operators start without Dashboard, Reports, and Integrations access unless the admin explicitly grants it. Permission changes are checked against the database on each API request.
- To create a strong session secret in PowerShell, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and place the output in `.env.local`; do not commit credentials or secrets to source control.

## Product images
- The product form accepts up to 10 images, maximum 5 MB each.
- Images are uploaded server-side to Cloudinary; their URLs are stored in MongoDB.
- Never expose Cloudinary API secret in `NEXT_PUBLIC_` variables.
- Product create/edit forms accept CGST and SGST rates. Product price is treated as GST-inclusive for invoice calculations; each new order stores a snapshot of the rates used at order time.
- Set `INVOICE_COMPANY_NAME`, `INVOICE_GSTIN`, optional `INVOICE_PAN_NUMBER`, and `INVOICE_SHIPPING_FROM_ADDRESS` in `.env.local`. The order page's **Download Invoice** action generates a structured GST invoice PDF with billing/shipping addresses, item-level gross, proportionally allocated discount, taxable value, CGST, SGST and totals. Customer billing/shipping fields fall back to the existing order address when distinct addresses were not supplied.

## Included routes
- `GET/POST /api/products` — list/create products; create supports multipart image upload.
- `GET/PATCH/DELETE /api/products/:id` — product operations.
- `GET /api/orders` and `GET/PATCH /api/orders/:id` — protected order management. `POST /api/orders` — public customer order placement; new orders must reference active products by `productId` or SKU and reserve stock from one active warehouse.
- `GET /api/inventory`, `POST /api/inventory/adjust` and `GET /api/inventory/movements` — warehouse inventory, validated stock adjustments and movement history.
- `GET /api/listings` — channel listing state.
- `POST /api/pricing/preview` and `/api/pricing/apply` — channel price rules.
- `GET /api/sync-jobs` and `POST /api/sync-jobs/:id/retry` — sync job management.

## Phase status and production boundary
- Phase 1: product and inventory foundation — starter APIs and UI included; review stock transactions before production.
- Phase 2: website storefront, payment processing, full order lifecycle — not complete in this CRM dashboard starter.
- Phase 3: queue, pricing, sync tracking and adapter scaffold — included as foundation.
- Phase 4: Amazon and Flipkart — real API adapters are not enabled; configure authorized seller API access and implement/validate provider-specific payloads before live use.
- Phase 5: Meesho — adapter access is account/partner dependent; default is manual/partner-required, not live API sync.

The Amazon, Flipkart and Meesho adapters in this starter do not claim to publish live listings. No marketplace credentials are included. This ZIP is a starter implementation, not a production-certified integration. Add authentication/RBAC, signed webhook validation, idempotent order import, provider-specific API mappers, tests, monitoring and backups before handling real orders.

## Order stock lifecycle
- Configure `DEFAULT_ORDER_WAREHOUSE` with the exact name of an active warehouse, or include `warehouse` (exact warehouse name) in each `POST /api/orders` request.
- New products with initial stock are assigned to `DEFAULT_ORDER_WAREHOUSE`; if unset, the app uses the only active warehouse. When multiple active warehouses exist, configure the variable explicitly.
- On database connection, the app removes the obsolete unique `sku + warehouse` index from `inventories` after verifying its exact definition; the current unique `productId + warehouse` index is retained.
- To initialize warehouse inventory for existing products that do not yet have inventory records, configure the warehouse as above and run `npx tsx scripts/backfill-inventory.ts` once. Products that already have inventory records are left unchanged.
- The Inventory page reads warehouse allocations from MongoDB. Stock changes made there update inventory, the product's aggregate stock/status and the movement history; product stock alone is not treated as a warehouse allocation.
- Every order item must map to an active product using `productId` or `sku`. Missing mappings or insufficient available inventory prevent the order from being saved.
- Pending/processing orders reserve stock, reducing available stock immediately without changing physical on-hand stock. Shipping/delivery deducts the reserved quantity from on-hand stock. Cancelling before shipment releases the reservation.
- Orders already shipped or delivered cannot be cancelled automatically; returned goods should be recorded with an inventory adjustment after receipt.
- Order creation and stock transitions use MongoDB transactions when the server supports them (for example, Atlas or a local replica set). Standalone MongoDB uses atomic per-inventory updates with compensating rollback if a later database write fails; use a replica set for full multi-document atomicity.
