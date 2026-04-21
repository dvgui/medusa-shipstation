"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyShipStationLabelStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const client_1 = require("../../lib/shipstation-client/client");
/**
 * Purchases a ShipStation label for a rate_id the admin has picked, persists
 * the tracking metadata onto fulfillment.data, marks the Medusa shipment
 * shipped via createShipmentWorkflow, and emits shipment.created so the
 * order-shipped email fires.
 *
 * Idempotency: if fulfillment.data.ssLabelId is already set, the step
 * refetches the existing label (rather than buying again) and proceeds
 * to mark shipped. Buying a label twice is expensive — always guard.
 */
exports.buyShipStationLabelStep = (0, workflows_sdk_1.createStep)("buy-shipstation-label", async (input, { container }) => {
    const logger = container.resolve("logger");
    const apiKey = process.env.SHIPSTATION_API_KEY;
    if (!apiKey) {
        throw new Error("SHIPSTATION_API_KEY environment variable is not set");
    }
    const client = new client_1.ShipStationClient({ apiKey }, logger);
    const fulfillmentService = container.resolve(utils_1.Modules.FULFILLMENT);
    const existing = await fulfillmentService.retrieveFulfillment(input.fulfillmentId);
    const existingData = (existing.data ??
        {});
    const existingLabelId = existingData.ssLabelId;
    let label;
    if (existingLabelId) {
        logger.info(`[ShipStation] Fulfillment ${input.fulfillmentId} already has ssLabelId=${existingLabelId} — refetching instead of re-buying.`);
        label = await client.getLabel(existingLabelId);
    }
    else {
        logger.info(`[ShipStation] Buying label for fulfillment ${input.fulfillmentId} rate_id=${input.rateId}`);
        label = await client.buyLabelFromRate(input.rateId, {
            label_format: input.labelFormat,
            label_layout: input.labelLayout,
        });
    }
    if (label.voided) {
        throw new Error(`ShipStation label ${label.label_id} has been voided — refuse to attach to fulfillment.`);
    }
    const trackingNumber = label.tracking_number ?? "";
    if (!trackingNumber) {
        throw new Error(`ShipStation label ${label.label_id} has no tracking_number yet (status=${label.status}).`);
    }
    const carrierCode = label.carrier_code ?? "";
    const carrierId = label.carrier_id ?? "";
    const serviceCode = label.service_code ?? "";
    const labelUrl = label.label_download?.href ??
        label.label_download?.pdf ??
        label.label_download?.png ??
        "";
    const trackingUrl = client_1.ShipStationClient.trackingUrlFor(carrierCode, trackingNumber);
    // 1) Persist SS label + tracking metadata on the fulfillment.
    try {
        const mergedData = {
            ...existingData,
            ssShipmentId: label.shipment_id,
            ssLabelId: label.label_id,
            ssCarrierId: carrierId,
            ssCarrierCode: carrierCode,
            ssServiceCode: serviceCode,
            ssTrackingNumber: trackingNumber,
            ssLabelUrl: labelUrl,
            ssShipmentCost: label.shipment_cost ?? null,
        };
        await fulfillmentService.updateFulfillment(input.fulfillmentId, {
            data: mergedData,
        });
    }
    catch (e) {
        logger.warn(`[ShipStation] Failed to persist label metadata on fulfillment ${input.fulfillmentId}: ${e?.message ?? e}`);
    }
    // 2) Mark shipped with tracking + label URL on the label row.
    await (0, core_flows_1.createShipmentWorkflow)(container).run({
        input: {
            id: input.fulfillmentId,
            labels: [
                {
                    tracking_number: trackingNumber,
                    tracking_url: trackingUrl,
                    label_url: labelUrl,
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
    logger.info(`[ShipStation] Label bought for fulfillment ${input.fulfillmentId}. label_id=${label.label_id} tracking=${trackingNumber} carrier=${carrierCode}`);
    return new workflows_sdk_1.StepResponse({
        label_id: label.label_id,
        shipment_id: label.shipment_id,
        tracking_number: trackingNumber,
        carrier_id: carrierId,
        carrier_code: carrierCode,
        service_code: serviceCode,
        label_url: labelUrl,
        shipment_cost: label.shipment_cost,
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV5LXNoaXBzdGF0aW9uLWxhYmVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9zdGVwcy9idXktc2hpcHN0YXRpb24tbGFiZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBQTRFO0FBTTVFLHFEQUdrQztBQUNsQyw0REFBb0U7QUFDcEUsZ0VBQXVFO0FBb0J2RTs7Ozs7Ozs7O0dBU0c7QUFDVSxRQUFBLHVCQUF1QixHQUFHLElBQUEsMEJBQVUsRUFDN0MsdUJBQXVCLEVBQ3ZCLEtBQUssRUFDRCxLQUFtQyxFQUNuQyxFQUFFLFNBQVMsRUFBa0MsRUFDTyxFQUFFO0lBQ3RELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDMUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQTtJQUM5QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDVixNQUFNLElBQUksS0FBSyxDQUNYLHFEQUFxRCxDQUN4RCxDQUFBO0lBQ0wsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFHLElBQUksMEJBQWlCLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUV4RCxNQUFNLGtCQUFrQixHQUNwQixTQUFTLENBQUMsT0FBTyxDQUE0QixlQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFFckUsTUFBTSxRQUFRLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FDekQsS0FBSyxDQUFDLGFBQWEsQ0FDdEIsQ0FBQTtJQUNELE1BQU0sWUFBWSxHQUNkLENBQUUsUUFBMEQsQ0FBQyxJQUFJO1FBQzdELEVBQUUsQ0FBNEIsQ0FBQTtJQUV0QyxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsU0FBK0IsQ0FBQTtJQUVwRSxJQUFJLEtBQUssQ0FBQTtJQUNULElBQUksZUFBZSxFQUFFLENBQUM7UUFD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