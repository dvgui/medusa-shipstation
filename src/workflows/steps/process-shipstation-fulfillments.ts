import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaContainer } from "@medusajs/framework/types"
import { markShipStationShippedWorkflow } from "../mark-shipstation-shipped"
import { PendingShipStationFulfillment } from "./find-pending-shipstation-fulfillments"

export interface ProcessShipStationFulfillmentsStepInput {
    fulfillments: PendingShipStationFulfillment[]
}

export interface ProcessShipStationFulfillmentsStepOutput {
    processed: number
    shipped: number
}

/**
 * Iterates over pending fulfillments and reconciles each via
 * markShipStationShippedWorkflow. Per-fulfillment errors are logged but don't
 * abort the batch.
 */
export const processShipStationFulfillmentsStep = createStep(
    "process-shipstation-fulfillments",
    async (
        input: ProcessShipStationFulfillmentsStepInput,
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<ProcessShipStationFulfillmentsStepOutput>> => {
        const logger = container.resolve("logger")
        let shipped = 0

        for (const pending of input.fulfillments) {
            try {
                const { result } = await markShipStationShippedWorkflow(
                    container
                ).run({
                    input: {
                        fulfillmentId: pending.fulfillmentId,
                        ssShipmentId: pending.ssShipmentId,
                    },
                })

                if (result?.shipped) {
                    shipped++
                }
            } catch (error: any) {
                logger.error(
                    `[ShipStation] Error processing fulfillment ${pending.fulfillmentId}: ${error?.message ?? error}`
                )
            }
        }

        return new StepResponse({
            processed: input.fulfillments.length,
            shipped,
        })
    }
)
