import { MedusaContainer } from "@medusajs/framework/types"
import { pollShipStationFulfillmentsWorkflow } from "../workflows/poll-shipstation-fulfillments"

/**
 * Scheduled job — polls ShipStation for ship-notify updates as a fallback
 * to the SHIP_NOTIFY webhook. Webhooks deliver most updates in near real-time
 * but can be lost (delivery retries, secret rotation, downtime), so we
 * reconcile every 30 minutes.
 */
export default async function pollShipStationFulfillments(
    container: MedusaContainer
): Promise<void> {
    const logger = container.resolve("logger")
    logger.info("[ShipStation] Starting fulfillment status poll…")

    try {
        const { result } = await pollShipStationFulfillmentsWorkflow(container).run({
            input: {},
        })

        logger.info(
            `[ShipStation] Poll complete — processed: ${result.processed}, shipped: ${result.shipped}`
        )
    } catch (error: any) {
        logger.error(
            `[ShipStation] Polling workflow failed: ${error?.message ?? error}`
        )
    }
}

export const config = {
    name: "poll-shipstation-fulfillments",
    schedule: {
        /** Interval in milliseconds — 30 minutes. */
        interval: 30 * 60 * 1000,
    },
}
