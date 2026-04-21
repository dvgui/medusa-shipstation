"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkShipStationShipmentStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const client_1 = require("../../lib/shipstation-client/client");
/**
 * Fetches a single v2 shipment by id. Returns the record when the shipment
 * has a non-empty tracking_number AND status isn't cancelled; otherwise null.
 * Any HTTP error returns null so one bad record doesn't abort the batch poll.
 */
exports.checkShipStationShipmentStep = (0, workflows_sdk_1.createStep)("check-shipstation-shipment", async (input, { container }) => {
    const logger = container.resolve("logger");
    const apiKey = process.env.SHIPSTATION_API_KEY;
    if (!apiKey) {
        throw new Error("SHIPSTATION_API_KEY environment variable is not set");
    }
    const client = new client_1.ShipStationClient({ apiKey }, logger);
    try {
        const shipment = await client.getShipment(input.ssShipmentId);
        if (!shipment)
            return new workflows_sdk_1.StepResponse(null);
        if (shipment.shipment_status === "cancelled") {
            return new workflows_sdk_1.StepResponse(null);
        }
        if (!shipment.tracking_number) {
            return new workflows_sdk_1.StepResponse(null);
        }
        return new workflows_sdk_1.StepResponse(shipment);
    }
    catch (error) {
        logger.warn(`[ShipStation] Could not fetch shipment ${input.ssShipmentId}: ${error.message}`);
        return new workflows_sdk_1.StepResponse(null);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2stc2hpcHN0YXRpb24tc2hpcG1lbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9zdGVwcy9jaGVjay1zaGlwc3RhdGlvbi1zaGlwbWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBQTRFO0FBRTVFLGdFQUF1RTtBQU92RTs7OztHQUlHO0FBQ1UsUUFBQSw0QkFBNEIsR0FBRyxJQUFBLDBCQUFVLEVBQ2xELDRCQUE0QixFQUM1QixLQUFLLEVBQ0QsS0FBd0MsRUFDeEMsRUFBRSxTQUFTLEVBQWtDLEVBQ0ksRUFBRTtJQUNuRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRTFDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUE7SUFDOUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FDWCxxREFBcUQsQ0FDeEQsQ0FBQTtJQUNMLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLDBCQUFpQixDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFFeEQsSUFBSSxDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM3RCxJQUFJLENBQUMsUUFBUTtZQUFFLE9BQU8sSUFBSSw0QkFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLElBQUksUUFBUSxDQUFDLGVBQWUsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM1QixPQUFPLElBQUksNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLDRCQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDbEIsTUFBTSxDQUFDLElBQUksQ0FDUCwwQ0FBMEMsS0FBSyxDQUFDLFlBQVksS0FBSyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQ25GLENBQUE7UUFDRCxPQUFPLElBQUksNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0FBQ0wsQ0FBQyxDQUNKLENBQUEifQ==