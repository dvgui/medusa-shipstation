"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollShipStationFulfillmentsWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const find_pending_shipstation_fulfillments_1 = require("./steps/find-pending-shipstation-fulfillments");
const process_shipstation_fulfillments_1 = require("./steps/process-shipstation-fulfillments");
/**
 * Polling workflow invoked by the scheduled job. Acts as a safety net for
 * webhook delivery failures: finds every fulfillment that has an ssOrderId but
 * no shipped_at, then asks ShipStation whether each one has shipped yet.
 */
exports.pollShipStationFulfillmentsWorkflow = (0, workflows_sdk_1.createWorkflow)("poll-shipstation-fulfillments", function () {
    const pendingFulfillments = (0, find_pending_shipstation_fulfillments_1.findPendingShipStationFulfillmentsStep)({});
    const result = (0, process_shipstation_fulfillments_1.processShipStationFulfillmentsStep)({
        fulfillments: pendingFulfillments,
    });
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sbC1zaGlwc3RhdGlvbi1mdWxmaWxsbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3BvbGwtc2hpcHN0YXRpb24tZnVsZmlsbG1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUcwQztBQUMxQyx5R0FBc0c7QUFDdEcsK0ZBR2lEO0FBRWpEOzs7O0dBSUc7QUFDVSxRQUFBLG1DQUFtQyxHQUFHLElBQUEsOEJBQWMsRUFDN0QsK0JBQStCLEVBQy9CO0lBQ0ksTUFBTSxtQkFBbUIsR0FBRyxJQUFBLDhFQUFzQyxFQUFDLEVBQUUsQ0FBQyxDQUFBO0lBRXRFLE1BQU0sTUFBTSxHQUFHLElBQUEscUVBQWtDLEVBQUM7UUFDOUMsWUFBWSxFQUFFLG1CQUFtQjtLQUNwQyxDQUFDLENBQUE7SUFFRixPQUFPLElBQUksZ0NBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDdkMsQ0FBQyxDQUNKLENBQUEifQ==