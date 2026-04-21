"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = pollShipStationFulfillments;
const poll_shipstation_fulfillments_1 = require("../workflows/poll-shipstation-fulfillments");
/**
 * Scheduled job — polls ShipStation for ship-notify updates as a fallback
 * to the SHIP_NOTIFY webhook. Webhooks deliver most updates in near real-time
 * but can be lost (delivery retries, secret rotation, downtime), so we
 * reconcile every 30 minutes.
 */
async function pollShipStationFulfillments(container) {
    const logger = container.resolve("logger");
    logger.info("[ShipStation] Starting fulfillment status poll…");
    try {
        const { result } = await (0, poll_shipstation_fulfillments_1.pollShipStationFulfillmentsWorkflow)(container).run({
            input: {},
        });
        logger.info(`[ShipStation] Poll complete — processed: ${result.processed}, shipped: ${result.shipped}`);
    }
    catch (error) {
        logger.error(`[ShipStation] Polling workflow failed: ${error?.message ?? error}`);
    }
}
exports.config = {
    name: "poll-shipstation-fulfillments",
    schedule: {
        /** Interval in milliseconds — 30 minutes. */
        interval: 30 * 60 * 1000,
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sbC1zaGlwc3RhdGlvbi1mdWxmaWxsbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvam9icy9wb2xsLXNoaXBzdGF0aW9uLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFTQSw4Q0FtQkM7QUEzQkQsOEZBQWdHO0FBRWhHOzs7OztHQUtHO0FBQ1ksS0FBSyxVQUFVLDJCQUEyQixDQUNyRCxTQUEwQjtJQUUxQixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaURBQWlELENBQUMsQ0FBQTtJQUU5RCxJQUFJLENBQUM7UUFDRCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFBLG1FQUFtQyxFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUN4RSxLQUFLLEVBQUUsRUFBRTtTQUNaLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxJQUFJLENBQ1AsNENBQTRDLE1BQU0sQ0FBQyxTQUFTLGNBQWMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUM3RixDQUFBO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDbEIsTUFBTSxDQUFDLEtBQUssQ0FDUiwwQ0FBMEMsS0FBSyxFQUFFLE9BQU8sSUFBSSxLQUFLLEVBQUUsQ0FDdEUsQ0FBQTtJQUNMLENBQUM7QUFDTCxDQUFDO0FBRVksUUFBQSxNQUFNLEdBQUc7SUFDbEIsSUFBSSxFQUFFLCtCQUErQjtJQUNyQyxRQUFRLEVBQUU7UUFDTiw2Q0FBNkM7UUFDN0MsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSTtLQUMzQjtDQUNKLENBQUEifQ==