import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaContainer } from "@medusajs/framework/types"
import { ShipStationClient } from "../../lib/shipstation-client/client"
import { ShipStationShipment } from "../../lib/shipstation-client/types"

export interface CheckShipStationShipmentStepInput {
    ssShipmentId: string
}

/**
 * Fetches a single v2 shipment by id. Returns the record when the shipment
 * has a non-empty tracking_number AND status isn't cancelled; otherwise null.
 * Any HTTP error returns null so one bad record doesn't abort the batch poll.
 */
export const checkShipStationShipmentStep = createStep(
    "check-shipstation-shipment",
    async (
        input: CheckShipStationShipmentStepInput,
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<ShipStationShipment | null>> => {
        const logger = container.resolve("logger")

        const apiKey = process.env.SHIPSTATION_API_KEY
        if (!apiKey) {
            throw new Error(
                "SHIPSTATION_API_KEY environment variable is not set"
            )
        }

        const client = new ShipStationClient({ apiKey }, logger)

        try {
            const shipment = await client.getShipment(input.ssShipmentId)
            if (!shipment) return new StepResponse(null)
            if (shipment.shipment_status === "cancelled") {
                return new StepResponse(null)
            }
            if (!shipment.tracking_number) {
                return new StepResponse(null)
            }
            return new StepResponse(shipment)
        } catch (error: any) {
            logger.warn(
                `[ShipStation] Could not fetch shipment ${input.ssShipmentId}: ${error.message}`
            )
            return new StepResponse(null)
        }
    }
)
