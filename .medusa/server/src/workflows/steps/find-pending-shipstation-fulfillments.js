"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPendingShipStationFulfillmentsStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
/**
 * Finds Medusa fulfillments that were pushed to ShipStation
 * (fulfillment.data.ssShipmentId set by createFulfillment) but haven't been
 * marked shipped yet.
 */
exports.findPendingShipStationFulfillmentsStep = (0, workflows_sdk_1.createStep)("find-pending-shipstation-fulfillments", async (_input, { container }) => {
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { data: fulfillments } = await query.graph({
        entity: "fulfillment",
        fields: ["id", "shipped_at", "data"],
        filters: {
            shipped_at: null,
        },
    });
    const pending = fulfillments
        .filter((f) => f.data &&
        typeof f.data === "object" &&
        f.data.ssShipmentId != null)
        .map((f) => ({
        fulfillmentId: f.id,
        ssShipmentId: String(f.data.ssShipmentId),
    }));
    return new workflows_sdk_1.StepResponse(pending);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1wZW5kaW5nLXNoaXBzdGF0aW9uLWZ1bGZpbGxtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3Mvc3RlcHMvZmluZC1wZW5kaW5nLXNoaXBzdGF0aW9uLWZ1bGZpbGxtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBNEU7QUFDNUUscURBQXFFO0FBUXJFOzs7O0dBSUc7QUFDVSxRQUFBLHNDQUFzQyxHQUFHLElBQUEsMEJBQVUsRUFDNUQsdUNBQXVDLEVBQ3ZDLEtBQUssRUFDRCxNQUE2QixFQUM3QixFQUFFLFNBQVMsRUFBa0MsRUFDUyxFQUFFO0lBQ3hELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFaEUsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDN0MsTUFBTSxFQUFFLGFBQWE7UUFDckIsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUM7UUFDcEMsT0FBTyxFQUFFO1lBQ0wsVUFBVSxFQUFFLElBQUk7U0FDbkI7S0FDSixDQUFDLENBQUE7SUFFRixNQUFNLE9BQU8sR0FBb0MsWUFBWTtTQUN4RCxNQUFNLENBQ0gsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNGLENBQUMsQ0FBQyxJQUFJO1FBQ04sT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVE7UUFDekIsQ0FBQyxDQUFDLElBQWdDLENBQUMsWUFBWSxJQUFJLElBQUksQ0FDL0Q7U0FDQSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDVCxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUU7UUFDbkIsWUFBWSxFQUFFLE1BQU0sQ0FDZixDQUFDLENBQUMsSUFBZ0MsQ0FBQyxZQUFZLENBQ25EO0tBQ0osQ0FBQyxDQUFDLENBQUE7SUFFUCxPQUFPLElBQUksNEJBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNwQyxDQUFDLENBQ0osQ0FBQSJ9