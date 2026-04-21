import {
    createWorkflow,
    WorkflowResponse,
    transform,
} from "@medusajs/framework/workflows-sdk"
import { checkShipStationShipmentStep } from "./steps/check-shipstation-shipments"
import {
    markShipStationShippedStep,
    MarkShipStationShippedStepOutput,
} from "./steps/mark-shipstation-shipped"

export interface MarkShipStationShippedWorkflowInput {
    fulfillmentId: string
    ssShipmentId: string
    /**
     * Optional: carrier_code as seen in the webhook delivery payload. v2
     * shipment objects only carry carrier_id, so forwarding the friendly code
     * here lets the subscriber build a proper tracking URL.
     */
    carrierCode?: string | null
}

/**
 * Reconciles a single Medusa fulfillment with its ShipStation shipment.
 * Called by the webhook handler (on fulfillment_shipped_v2) and by the poll
 * fallback. Safe to call repeatedly — the mark step short-circuits when the
 * shipment has no tracking yet.
 */
export const markShipStationShippedWorkflow = createWorkflow(
    "mark-shipstation-shipped",
    function (
        input: MarkShipStationShippedWorkflowInput
    ): WorkflowResponse<MarkShipStationShippedStepOutput> {
        const shipment = checkShipStationShipmentStep({
            ssShipmentId: input.ssShipmentId,
        })

        const markInput = transform({ input, shipment }, (data) => ({
            fulfillmentId: data.input.fulfillmentId,
            shipment: data.shipment,
            carrierCode: data.input.carrierCode ?? null,
        }))

        const result = markShipStationShippedStep(markInput)

        return new WorkflowResponse(result)
    }
)
