import {
    createWorkflow,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { findPendingShipStationFulfillmentsStep } from "./steps/find-pending-shipstation-fulfillments"
import {
    processShipStationFulfillmentsStep,
    ProcessShipStationFulfillmentsStepOutput,
} from "./steps/process-shipstation-fulfillments"

/**
 * Polling workflow invoked by the scheduled job. Acts as a safety net for
 * webhook delivery failures: finds every fulfillment that has an ssOrderId but
 * no shipped_at, then asks ShipStation whether each one has shipped yet.
 */
export const pollShipStationFulfillmentsWorkflow = createWorkflow(
    "poll-shipstation-fulfillments",
    function (): WorkflowResponse<ProcessShipStationFulfillmentsStepOutput> {
        const pendingFulfillments = findPendingShipStationFulfillmentsStep({})

        const result = processShipStationFulfillmentsStep({
            fulfillments: pendingFulfillments,
        })

        return new WorkflowResponse(result)
    }
)
