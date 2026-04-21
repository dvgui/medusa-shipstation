import {
    createWorkflow,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
    buyShipStationLabelStep,
    BuyShipStationLabelStepOutput,
} from "./steps/buy-shipstation-label"

export interface BuyShipStationLabelWorkflowInput {
    fulfillmentId: string
    rateId: string
    labelFormat?: "pdf" | "png" | "zpl"
    labelLayout?: "4x6" | "letter"
}

/**
 * Thin wrapper around buyShipStationLabelStep so callers (admin API routes,
 * subscribers, exec scripts) can invoke a workflow rather than a raw step.
 * Idempotent: re-running with the same fulfillment refetches the existing
 * label instead of buying a second time.
 */
export const buyShipStationLabelWorkflow = createWorkflow(
    "buy-shipstation-label",
    function (
        input: BuyShipStationLabelWorkflowInput
    ): WorkflowResponse<BuyShipStationLabelStepOutput> {
        const result = buyShipStationLabelStep(input)
        return new WorkflowResponse(result)
    }
)
