import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"

export interface PendingShipStationFulfillment {
    fulfillmentId: string
    ssShipmentId: string
}

/**
 * Finds Medusa fulfillments that were pushed to ShipStation
 * (fulfillment.data.ssShipmentId set by createFulfillment) but haven't been
 * marked shipped yet.
 */
export const findPendingShipStationFulfillmentsStep = createStep(
    "find-pending-shipstation-fulfillments",
    async (
        _input: Record<string, never>,
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<PendingShipStationFulfillment[]>> => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { data: fulfillments } = await query.graph({
            entity: "fulfillment",
            fields: ["id", "shipped_at", "data"],
            filters: {
                shipped_at: null,
            },
        })

        const pending: PendingShipStationFulfillment[] = fulfillments
            .filter(
                (f) =>
                    f.data &&
                    typeof f.data === "object" &&
                    (f.data as Record<string, unknown>).ssShipmentId != null
            )
            .map((f) => ({
                fulfillmentId: f.id,
                ssShipmentId: String(
                    (f.data as Record<string, unknown>).ssShipmentId
                ),
            }))

        return new StepResponse(pending)
    }
)
