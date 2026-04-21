import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
    IEventBusModuleService,
    IFulfillmentModuleService,
    MedusaContainer,
} from "@medusajs/framework/types"
import {
    FulfillmentWorkflowEvents,
    Modules,
} from "@medusajs/framework/utils"
import { createShipmentWorkflow } from "@medusajs/medusa/core-flows"
import { ShipStationClient } from "../../lib/shipstation-client/client"
import { ShipStationShipment } from "../../lib/shipstation-client/types"

export interface MarkShipStationShippedStepInput {
    fulfillmentId: string
    shipment: ShipStationShipment | null
    /**
     * Optional fallback when carrier_code is not on the shipment response
     * (v2 returns carrier_id, which is opaque). The webhook payload's
     * carrier_code can be passed through here so tracking URLs work.
     */
    carrierCode?: string | null
}

export interface MarkShipStationShippedStepOutput {
    shipped: boolean
}

/**
 * Marks the Medusa fulfillment as shipped from a resolved v2 ShipStation
 * shipment. Writes tracking on the label and persists ShipStation metadata
 * on fulfillment.data so downstream subscribers can build the tracking URL.
 *
 * createShipmentWorkflow only updates shipped_at — it does NOT emit
 * shipment.created. This step emits the event explicitly so the order-shipped
 * email fires for both webhook-driven and polled shipments.
 */
export const markShipStationShippedStep = createStep(
    "mark-shipstation-shipped",
    async (
        input: MarkShipStationShippedStepInput,
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<MarkShipStationShippedStepOutput>> => {
        const logger = container.resolve("logger")
        if (!input.shipment || !input.shipment.tracking_number) {
            return new StepResponse({ shipped: false })
        }

        const shipment = input.shipment
        const trackingNumber = shipment.tracking_number!
        const carrierId = shipment.carrier_id ?? ""
        // v2's shipment object carries carrier_id (opaque `se-…`). carrier_code
        // — the friendly string we need to build tracking URLs — usually comes
        // in the webhook delivery payload, so the caller forwards it here.
        const carrierCode =
            input.carrierCode ??
            ((shipment as unknown as { carrier_code?: string | null })
                .carrier_code as string | undefined) ??
            ""
        const trackingUrl = ShipStationClient.trackingUrlFor(
            carrierCode,
            trackingNumber
        )

        // 1) Persist carrier + tracking metadata on the fulfillment first.
        const fulfillmentService =
            container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)
        try {
            const existing = await fulfillmentService.retrieveFulfillment(
                input.fulfillmentId
            )
            const mergedData = {
                ...((existing as unknown as { data?: Record<string, unknown> })
                    .data ?? {}),
                ssShipmentId: shipment.shipment_id,
                ssCarrierId: carrierId,
                ssCarrierCode: carrierCode,
                ssServiceCode: shipment.service_code ?? null,
                ssTrackingNumber: trackingNumber,
            }
            await fulfillmentService.updateFulfillment(input.fulfillmentId, {
                data: mergedData,
            } as unknown as Parameters<
                IFulfillmentModuleService["updateFulfillment"]
            >[1])
        } catch (e: any) {
            logger.warn(
                `[ShipStation] Failed to persist carrier metadata on fulfillment ${input.fulfillmentId}: ${e?.message ?? e}`
            )
        }

        // 2) Mark shipped via the core createShipmentWorkflow.
        await createShipmentWorkflow(container).run({
            input: {
                id: input.fulfillmentId,
                labels: [
                    {
                        tracking_number: trackingNumber,
                        tracking_url: trackingUrl,
                        label_url: "",
                    },
                ],
            },
        })

        // 3) Emit shipment.created so the order-shipped email subscriber fires.
        const eventBus = container.resolve<IEventBusModuleService>(
            Modules.EVENT_BUS
        )
        await eventBus.emit({
            name: FulfillmentWorkflowEvents.SHIPMENT_CREATED,
            data: {
                id: input.fulfillmentId,
                no_notification: false,
            },
        })

        logger.info(
            `[ShipStation] Fulfillment ${input.fulfillmentId} marked shipped. carrier_code=${carrierCode} tracking=${trackingNumber}`
        )

        return new StepResponse({ shipped: true })
    }
)
