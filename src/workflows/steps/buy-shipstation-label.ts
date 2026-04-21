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

export interface BuyShipStationLabelStepInput {
    fulfillmentId: string
    rateId: string
    labelFormat?: "pdf" | "png" | "zpl"
    labelLayout?: "4x6" | "letter"
}

export interface BuyShipStationLabelStepOutput {
    label_id: string
    shipment_id: string
    tracking_number: string
    carrier_id?: string
    carrier_code?: string
    service_code?: string
    label_url: string
    shipment_cost?: { currency: string; amount: number }
}

/**
 * Purchases a ShipStation label for a rate_id the admin has picked, persists
 * the tracking metadata onto fulfillment.data, marks the Medusa shipment
 * shipped via createShipmentWorkflow, and emits shipment.created so the
 * order-shipped email fires.
 *
 * Idempotency: if fulfillment.data.ssLabelId is already set, the step
 * refetches the existing label (rather than buying again) and proceeds
 * to mark shipped. Buying a label twice is expensive — always guard.
 */
export const buyShipStationLabelStep = createStep(
    "buy-shipstation-label",
    async (
        input: BuyShipStationLabelStepInput,
        { container }: { container: MedusaContainer }
    ): Promise<StepResponse<BuyShipStationLabelStepOutput>> => {
        const logger = container.resolve("logger")
        const apiKey = process.env.SHIPSTATION_API_KEY
        if (!apiKey) {
            throw new Error(
                "SHIPSTATION_API_KEY environment variable is not set"
            )
        }
        const client = new ShipStationClient({ apiKey }, logger)

        const fulfillmentService =
            container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)

        const existing = await fulfillmentService.retrieveFulfillment(
            input.fulfillmentId
        )
        const existingData =
            ((existing as unknown as { data?: Record<string, unknown> }).data ??
                {}) as Record<string, unknown>

        const existingLabelId = existingData.ssLabelId as string | undefined

        let label
        if (existingLabelId) {
            logger.info(
                `[ShipStation] Fulfillment ${input.fulfillmentId} already has ssLabelId=${existingLabelId} — refetching instead of re-buying.`
            )
            label = await client.getLabel(existingLabelId)
        } else {
            logger.info(
                `[ShipStation] Buying label for fulfillment ${input.fulfillmentId} rate_id=${input.rateId}`
            )
            label = await client.buyLabelFromRate(input.rateId, {
                label_format: input.labelFormat,
                label_layout: input.labelLayout,
            })
        }

        if (label.voided) {
            throw new Error(
                `ShipStation label ${label.label_id} has been voided — refuse to attach to fulfillment.`
            )
        }

        const trackingNumber = label.tracking_number ?? ""
        if (!trackingNumber) {
            throw new Error(
                `ShipStation label ${label.label_id} has no tracking_number yet (status=${label.status}).`
            )
        }

        const carrierCode = label.carrier_code ?? ""
        const carrierId = label.carrier_id ?? ""
        const serviceCode = label.service_code ?? ""
        const labelUrl =
            label.label_download?.href ??
            label.label_download?.pdf ??
            label.label_download?.png ??
            ""
        const trackingUrl = ShipStationClient.trackingUrlFor(
            carrierCode,
            trackingNumber
        )

        // 1) Persist SS label + tracking metadata on the fulfillment.
        try {
            const mergedData = {
                ...existingData,
                ssShipmentId: label.shipment_id,
                ssLabelId: label.label_id,
                ssCarrierId: carrierId,
                ssCarrierCode: carrierCode,
                ssServiceCode: serviceCode,
                ssTrackingNumber: trackingNumber,
                ssLabelUrl: labelUrl,
                ssShipmentCost: label.shipment_cost ?? null,
            }
            await fulfillmentService.updateFulfillment(input.fulfillmentId, {
                data: mergedData,
            } as unknown as Parameters<
                IFulfillmentModuleService["updateFulfillment"]
            >[1])
        } catch (e: any) {
            logger.warn(
                `[ShipStation] Failed to persist label metadata on fulfillment ${input.fulfillmentId}: ${e?.message ?? e}`
            )
        }

        // 2) Mark shipped with tracking + label URL on the label row.
        await createShipmentWorkflow(container).run({
            input: {
                id: input.fulfillmentId,
                labels: [
                    {
                        tracking_number: trackingNumber,
                        tracking_url: trackingUrl,
                        label_url: labelUrl,
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
            `[ShipStation] Label bought for fulfillment ${input.fulfillmentId}. label_id=${label.label_id} tracking=${trackingNumber} carrier=${carrierCode}`
        )

        return new StepResponse({
            label_id: label.label_id,
            shipment_id: label.shipment_id,
            tracking_number: trackingNumber,
            carrier_id: carrierId,
            carrier_code: carrierCode,
            service_code: serviceCode,
            label_url: labelUrl,
            shipment_cost: label.shipment_cost,
        })
    }
)
