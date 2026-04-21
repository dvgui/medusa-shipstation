"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processShipStationFulfillmentsStep = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const mark_shipstation_shipped_1 = require("../mark-shipstation-shipped");
/**
 * Iterates over pending fulfillments and reconciles each via
 * markShipStationShippedWorkflow. Per-fulfillment errors are logged but don't
 * abort the batch.
 */
exports.processShipStationFulfillmentsStep = (0, workflows_sdk_1.createStep)("process-shipstation-fulfillments", async (input, { container }) => {
    const logger = container.resolve("logger");
    let shipped = 0;
    for (const pending of input.fulfillments) {
        try {
            const { result } = await (0, mark_shipstation_shipped_1.markShipStationShippedWorkflow)(container).run({
                input: {
                    fulfillmentId: pending.fulfillmentId,
                    ssShipmentId: pending.ssShipmentId,
                },
            });
            if (result?.shipped) {
                shipped++;
            }
        }
        catch (error) {
            logger.error(`[ShipStation] Error processing fulfillment ${pending.fulfillmentId}: ${error?.message ?? error}`);
        }
    }
    return new workflows_sdk_1.StepResponse({
        processed: input.fulfillments.length,
        shipped,
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy1zaGlwc3RhdGlvbi1mdWxmaWxsbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3N0ZXBzL3Byb2Nlc3Mtc2hpcHN0YXRpb24tZnVsZmlsbG1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUE0RTtBQUU1RSwwRUFBNEU7QUFZNUU7Ozs7R0FJRztBQUNVLFFBQUEsa0NBQWtDLEdBQUcsSUFBQSwwQkFBVSxFQUN4RCxrQ0FBa0MsRUFDbEMsS0FBSyxFQUNELEtBQThDLEVBQzlDLEVBQUUsU0FBUyxFQUFrQyxFQUNrQixFQUFFO0lBQ2pFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDMUMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFBO0lBRWYsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDO1lBQ0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBQSx5REFBOEIsRUFDbkQsU0FBUyxDQUNaLENBQUMsR0FBRyxDQUFDO2dCQUNGLEtBQUssRUFBRTtvQkFDSCxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWE7b0JBQ3BDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtpQkFDckM7YUFDSixDQUFDLENBQUE7WUFFRixJQUFJLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxFQUFFLENBQUE7WUFDYixDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsTUFBTSxDQUFDLEtBQUssQ0FDUiw4Q0FBOEMsT0FBTyxDQUFDLGFBQWEsS0FBSyxLQUFLLEVBQUUsT0FBTyxJQUFJLEtBQUssRUFBRSxDQUNwRyxDQUFBO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPLElBQUksNEJBQVksQ0FBQztRQUNwQixTQUFTLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNO1FBQ3BDLE9BQU87S0FDVixDQUFDLENBQUE7QUFDTixDQUFDLENBQ0osQ0FBQSJ9