"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markShipStationShippedStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const client_1 = require("../../lib/shipstation-client/client");
/**
 * Marks the Medusa fulfillment as shipped from a resolved v2 ShipStation
 * shipment. Writes tracking on the label and persists ShipStation metadata
 * on fulfillment.data so downstream subscribers can build the tracking URL.
 *
 * createShipmentWorkflow only updates shipped_at — it does NOT emit
 * shipment.created. This step emits the event explicitly so the order-shipped
 * email fires for both webhook-driven and polled shipments.
 */
exports.markShipStationShippedStep = (0, workflows_sdk_1.createStep)("mark-shipstation-shipped", async (input, { container }) => {
    const logger = container.resolve("logger");
    if (!input.shipment || !input.shipment.tracking_number) {
        return new workflows_sdk_1.StepResponse({ shipped: false });
    }
    const shipment = input.shipment;
    const trackingNumber = shipment.tracking_number;
    const carrierId = shipment.carrier_id ?? "";
    // v2's shipment object carries carrier_id (opaque `se-…`). carrier_code
    // — the friendly string we need to build tracking URLs — usually comes
    // in the webhook delivery payload, so the caller forwards it here.
    const carrierCode = input.carrierCode ??
        shipment
            .carrier_code ??
        "";
    const trackingUrl = client_1.ShipStationClient.trackingUrlFor(carrierCode, trackingNumber);
    // 1) Persist carrier + tracking metadata on the fulfillment first.
    const fulfillmentService = container.resolve(utils_1.Modules.FULFILLMENT);
    try {
        const existing = await fulfillmentService.retrieveFulfillment(input.fulfillmentId);
        const mergedData = {
            ...(existing
                .data ?? {}),
            ssShipmentId: shipment.shipment_id,
            ssCarrierId: carrierId,
            ssCarrierCode: carrierCode,
            ssServiceCode: shipment.service_code ?? null,
            ssTrackingNumber: trackingNumber,
        };
        await fulfillmentService.updateFulfillment(input.fulfillmentId, {
            data: mergedData,
        });
    }
    catch (e) {
        logger.warn(`[ShipStation] Failed to persist carrier metadata on fulfillment ${input.fulfillmentId}: ${e?.message ?? e}`);
    }
    // 2) Mark shipped via the core createShipmentWorkflow.
    await (0, core_flows_1.createShipmentWorkflow)(container).run({
        input: {
            id: input.fulfillmentId,
            labels: [
                {
                    tracking_number: trackingNumber,
                    tracking_url: trackingUrl,
                    label_url: "",
                },
            ],
        },
    });
    // 3) Emit shipment.created so the order-shipped email subscriber fires.
    const eventBus = container.resolve(utils_1.Modules.EVENT_BUS);
    await eventBus.emit({
        name: utils_1.FulfillmentWorkflowEvents.SHIPMENT_CREATED,
        data: {
            id: input.fulfillmentId,
            no_notification: false,
        },
    });
    logger.info(`[ShipStation] Fulfillment ${input.fulfillmentId} marked shipped. carrier_code=${carrierCode} tracking=${trackingNumber}`);
    return new workflows_sdk_1.StepResponse({ shipped: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyay1zaGlwc3RhdGlvbi1zaGlwcGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9zdGVwcy9tYXJrLXNoaXBzdGF0aW9uLXNoaXBwZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBQTRFO0FBTTVFLHFEQUdrQztBQUNsQyw0REFBb0U7QUFDcEUsZ0VBQXVFO0FBa0J2RTs7Ozs7Ozs7R0FRRztBQUNVLFFBQUEsMEJBQTBCLEdBQUcsSUFBQSwwQkFBVSxFQUNoRCwwQkFBMEIsRUFDMUIsS0FBSyxFQUNELEtBQXNDLEVBQ3RDLEVBQUUsU0FBUyxFQUFrQyxFQUNVLEVBQUU7SUFDekQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDckQsT0FBTyxJQUFJLDRCQUFZLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQTtJQUMvQixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsZUFBZ0IsQ0FBQTtJQUNoRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQTtJQUMzQyx3RUFBd0U7SUFDeEUsdUVBQXVFO0lBQ3ZFLG1FQUFtRTtJQUNuRSxNQUFNLFdBQVcsR0FDYixLQUFLLENBQUMsV0FBVztRQUNmLFFBQXdEO2FBQ3JELFlBQW1DO1FBQ3hDLEVBQUUsQ0FBQTtJQUNOLE1BQU0sV0FBVyxHQUFHLDBCQUFpQixDQUFDLGNBQWMsQ0FDaEQsV0FBVyxFQUNYLGNBQWMsQ0FDakIsQ0FBQTtJQUVELG1FQUFtRTtJQUNuRSxNQUFNLGtCQUFrQixHQUNwQixTQUFTLENBQUMsT0FBTyxDQUE0QixlQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDckUsSUFBSSxDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FDekQsS0FBSyxDQUFDLGFBQWEsQ0FDdEIsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHO1lBQ2YsR0FBRyxDQUFFLFFBQTBEO2lCQUMxRCxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ2hCLFlBQVksRUFBRSxRQUFRLENBQUMsV0FBVztZQUNsQyxXQUFXLEVBQUUsU0FBUztZQUN0QixhQUFhLEVBQUUsV0FBVztZQUMxQixhQUFhLEVBQUUsUUFBUSxDQUFDLFlBQVksSUFBSSxJQUFJO1lBQzVDLGdCQUFnQixFQUFFLGNBQWM7U0FDbkMsQ0FBQTtRQUNELE1BQU0sa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRTtZQUM1RCxJQUFJLEVBQUUsVUFBVTtTQUdoQixDQUFDLENBQUE7SUFDVCxDQUFDO0lBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztRQUNkLE1BQU0sQ0FBQyxJQUFJLENBQ1AsbUVBQW1FLEtBQUssQ0FBQyxhQUFhLEtBQUssQ0FBQyxFQUFFLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FDL0csQ0FBQTtJQUNMLENBQUM7SUFFRCx1REFBdUQ7SUFDdkQsTUFBTSxJQUFBLG1DQUFzQixFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN4QyxLQUFLLEVBQUU7WUFDSCxFQUFFLEVBQUUsS0FBSyxDQUFDLGFBQWE7WUFDdkIsTUFBTSxFQUFFO2dCQUNKO29CQUNJLGVBQWUsRUFBRSxjQUFjO29CQUMvQixZQUFZLEVBQUUsV0FBVztvQkFDekIsU0FBUyxFQUFFLEVBQUU7aUJBQ2hCO2FBQ0o7U0FDSjtLQUNKLENBQUMsQ0FBQTtJQUVGLHdFQUF3RTtJQUN4RSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUM5QixlQUFPLENBQUMsU0FBUyxDQUNwQixDQUFBO0lBQ0QsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ2hCLElBQUksRUFBRSxpQ0FBeUIsQ0FBQyxnQkFBZ0I7UUFDaEQsSUFBSSxFQUFFO1lBQ0YsRUFBRSxFQUFFLEtBQUssQ0FBQyxhQUFhO1lBQ3ZCLGVBQWUsRUFBRSxLQUFLO1NBQ3pCO0tBQ0osQ0FBQyxDQUFBO0lBRUYsTUFBTSxDQUFDLElBQUksQ0FDUCw2QkFBNkIsS0FBSyxDQUFDLGFBQWEsaUNBQWlDLFdBQVcsYUFBYSxjQUFjLEVBQUUsQ0FDNUgsQ0FBQTtJQUVELE9BQU8sSUFBSSw0QkFBWSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7QUFDOUMsQ0FBQyxDQUNKLENBQUEifQ==