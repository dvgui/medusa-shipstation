# Medusa ShipStation Plugin (v2)

This plugin integrates ShipStation (v1 SSAPI) as a fulfillment provider for MedusaV2 commerce servers. It supports creating orders in ShipStation from Medusa fulfillments, updating Medusa shipments when labels are generated (via webhook or polling fallback), and cancelling ShipStation orders when Medusa fulfillments are cancelled.

## Installation

Install the plugin via your preferred package manager from the repository:

```bash
bun add shipstation-plugin@git+https://github.com/dvgui/medusa-shipstation.git#main
```

## Configuration

Register the plugin and add the provider to the fulfillment module in `medusa-config.ts`:

```ts
export default defineConfig({
  // ...
  plugins: [
    { resolve: "shipstation-plugin", options: {} },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          { resolve: "@medusajs/medusa/fulfillment-manual", id: "manual" },
          {
            resolve: "shipstation-plugin/modules/shipstation",
            id: "shipstation-fulfillment",
            options: {
              apiKey:    process.env.SHIPSTATION_API_KEY    || "",
              apiSecret: process.env.SHIPSTATION_API_SECRET || "",
              storeId:   process.env.SHIPSTATION_STORE_ID
                ? Number(process.env.SHIPSTATION_STORE_ID) : undefined,
            },
          },
        ],
      },
    },
  ],
})
```

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `SHIPSTATION_API_KEY` | yes | v1 SSAPI key (used as basic-auth username) |
| `SHIPSTATION_API_SECRET` | yes | v1 SSAPI secret (used as basic-auth password) |
| `SHIPSTATION_STORE_ID` | optional | Passed as `advancedOptions.storeId` when creating orders |

## Database sync

After installing and editing `medusa-config.ts`, sync the provider into the fulfillment module tables:

```bash
bun run medusa db:sync-links
```

(If your start script already runs `medusa db:migrate`, this happens automatically on deploy.)

## Admin dashboard

1. Boot the backend.
2. In Medusa Admin, go to **Settings → Locations & Shipping**.
3. Click the stock location and add a **Shipping Option**.
4. Select the provider: **`shipstation-fulfillment_shipstation-fulfillment`**.
5. Save. The option now appears in the Create Fulfillment modal on orders.

## Tracking updates

- **Webhook (preferred)** — subscribe to `SHIP_NOTIFY` pointing at your Medusa backend's `/hooks/shipstation?secret=...` endpoint. When a label is generated in ShipStation, the hook marks the Medusa fulfillment as shipped.
- **Polling fallback** — a cron job runs every 30 minutes, queries `GET /shipments?orderId=...` for each pending fulfillment, and marks any non-voided shipment as shipped. Safety net in case a webhook delivery is lost.
