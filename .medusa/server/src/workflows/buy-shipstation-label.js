"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyShipStationLabelWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const buy_shipstation_label_1 = require("./steps/buy-shipstation-label");
/**
 * Thin wrapper around buyShipStationLabelStep so callers (admin API routes,
 * subscribers, exec scripts) can invoke a workflow rather than a raw step.
 * Idempotent: re-running with the same fulfillment refetches the existing
 * label instead of buying a second time.
 */
exports.buyShipStationLabelWorkflow = (0, workflows_sdk_1.createWorkflow)("buy-shipstation-label", function (input) {
    const result = (0, buy_shipstation_label_1.buyShipStationLabelStep)(input);
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV5LXNoaXBzdGF0aW9uLWxhYmVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9idXktc2hpcHN0YXRpb24tbGFiZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBRzBDO0FBQzFDLHlFQUdzQztBQVN0Qzs7Ozs7R0FLRztBQUNVLFFBQUEsMkJBQTJCLEdBQUcsSUFBQSw4QkFBYyxFQUNyRCx1QkFBdUIsRUFDdkIsVUFDSSxLQUF1QztJQUV2QyxNQUFNLE1BQU0sR0FBRyxJQUFBLCtDQUF1QixFQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdDLE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUN2QyxDQUFDLENBQ0osQ0FBQSJ9