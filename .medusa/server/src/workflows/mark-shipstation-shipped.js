"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markShipStationShippedWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const check_shipstation_shipments_1 = require("./steps/check-shipstation-shipments");
const mark_shipstation_shipped_1 = require("./steps/mark-shipstation-shipped");
/**
 * Reconciles a single Medusa fulfillment with its ShipStation shipment.
 * Called by the webhook handler (on fulfillment_shipped_v2) and by the poll
 * fallback. Safe to call repeatedly — the mark step short-circuits when the
 * shipment has no tracking yet.
 */
exports.markShipStationShippedWorkflow = (0, workflows_sdk_1.createWorkflow)("mark-shipstation-shipped", function (input) {
    const shipment = (0, check_shipstation_shipments_1.checkShipStationShipmentStep)({
        ssShipmentId: input.ssShipmentId,
    });
    const markInput = (0, workflows_sdk_1.transform)({ input, shipment }, (data) => ({
        fulfillmentId: data.input.fulfillmentId,
        shipment: data.shipment,
        carrierCode: data.input.carrierCode ?? null,
    }));
    const result = (0, mark_shipstation_shipped_1.markShipStationShippedStep)(markInput);
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFyay1zaGlwc3RhdGlvbi1zaGlwcGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9tYXJrLXNoaXBzdGF0aW9uLXNoaXBwZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBSTBDO0FBQzFDLHFGQUFrRjtBQUNsRiwrRUFHeUM7QUFhekM7Ozs7O0dBS0c7QUFDVSxRQUFBLDhCQUE4QixHQUFHLElBQUEsOEJBQWMsRUFDeEQsMEJBQTBCLEVBQzFCLFVBQ0ksS0FBMEM7SUFFMUMsTUFBTSxRQUFRLEdBQUcsSUFBQSwwREFBNEIsRUFBQztRQUMxQyxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7S0FDbkMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxTQUFTLEdBQUcsSUFBQSx5QkFBUyxFQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWE7UUFDdkMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1FBQ3ZCLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJO0tBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUgsTUFBTSxNQUFNLEdBQUcsSUFBQSxxREFBMEIsRUFBQyxTQUFTLENBQUMsQ0FBQTtJQUVwRCxPQUFPLElBQUksZ0NBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDdkMsQ0FBQyxDQUNKLENBQUEifQ==