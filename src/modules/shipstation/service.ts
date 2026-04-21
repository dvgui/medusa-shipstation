import {
    AbstractFulfillmentProviderService,
    ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import {
    Logger,
    CreateFulfillmentResult,
    FulfillmentDTO,
    FulfillmentItemDTO,
    FulfillmentOrderDTO,
    FulfillmentOption,
    CalculateShippingOptionPriceDTO,
    CalculatedShippingOptionPrice,
    CreateShippingOptionDTO,
    RemoteQueryFunction,
    ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import { ShipStationClient } from "../../lib/shipstation-client/client"
import {
    ShipStationAddress,
    ShipStationCreateShipment,
    ShipStationPackage,
    ShipStationPackageItem,
} from "../../lib/shipstation-client/types"

type InjectedDependencies = {
    logger: Logger
    [ContainerRegistrationKeys.QUERY]?: RemoteQueryFunction
}

type Options = {
    apiKey: string
    /**
     * ShipStation warehouse_id (e.g. "se-12345") that labels ship from.
     * Required unless `shipFromFallback` is set — ShipStation v2 needs either
     * a warehouse_id or an inline ship_from address on every shipment.
     */
    warehouseId?: string
    /** Fallback ship-from address when no warehouseId is configured. */
    shipFromFallback?: ShipStationAddress
}

type Dimensions = {
    weight: number
    length: number
    width: number
    height: number
}

type HydratedVariant = {
    id?: string | null
    weight?: number | null
    length?: number | null
    width?: number | null
    height?: number | null
    sku?: string | null
    product_id?: string | null
    product?: {
        id?: string | null
        weight?: number | null
        length?: number | null
        width?: number | null
        height?: number | null
    } | null
}

type HydratedItem = {
    id?: string
    line_item_id?: string | null
    title?: string | null
    quantity?: number | null
    sku?: string | null
    unit_price?: number | string | null
    variant_id?: string | null
    product_id?: string | null
    weight?: number | null
    length?: number | null
    width?: number | null
    height?: number | null
    variant?: HydratedVariant | null
}

type ResolvedItem = {
    name: string
    sku: string | undefined
    quantity: number
    unitPrice: number
    unitWeightInGrams: number
}

const toPositive = (v: unknown): number | undefined => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : undefined
}

const SHIPSTATION_PROVIDER_IDENTIFIER = "shipstation-fulfillment"

export class ShipStationProviderService extends AbstractFulfillmentProviderService {
    static identifier = SHIPSTATION_PROVIDER_IDENTIFIER

    private client: ShipStationClient
    private logger_: Logger
    private query_?: RemoteQueryFunction
    private warehouseId_?: string
    private shipFromFallback_?: ShipStationAddress

    constructor(deps: InjectedDependencies, options: Options) {
        super()
        this.logger_ = deps.logger

        try {
            this.query_ = (deps as Record<string, unknown>)[
                ContainerRegistrationKeys.QUERY
            ] as RemoteQueryFunction | undefined
        } catch {
            this.query_ = undefined
        }

        if (!options.apiKey) {
            this.logger_.warn(
                "[ShipStation] apiKey missing in fulfillment module options."
            )
        }

        this.warehouseId_ = options.warehouseId
        this.shipFromFallback_ = options.shipFromFallback

        this.client = new ShipStationClient(
            { apiKey: options.apiKey },
            this.logger_
        )
    }

    private async fetchProductDimensions(
        productId: string
    ): Promise<Partial<Dimensions>> {
        if (!this.query_) return {}
        try {
            const { data } = await this.query_.graph({
                entity: "product",
                fields: ["id", "weight", "length", "width", "height"],
                filters: { id: productId },
            })
            const p = data?.[0]
            if (!p) return {}
            return {
                weight: toPositive(p.weight),
                length: toPositive(p.length),
                width: toPositive(p.width),
                height: toPositive(p.height),
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            this.logger_.warn(
                `[ShipStation] Failed to fetch product ${productId} dimensions: ${message}`
            )
            return {}
        }
    }

    private async getSmartWeight(
        variantId: string | undefined,
        order: Partial<FulfillmentOrderDTO> | undefined,
        currentWeight?: number
    ): Promise<Dimensions> {
        const items = (order?.items ?? []) as HydratedItem[]
        const orderItem = variantId
            ? items.find((i) => i.variant_id === variantId)
            : undefined
        const variant = orderItem?.variant ?? undefined
        const product = variant?.product ?? undefined

        let weight =
            toPositive(currentWeight) ??
            toPositive(variant?.weight) ??
            toPositive(orderItem?.weight) ??
            toPositive(product?.weight)

        let length =
            toPositive(variant?.length) ??
            toPositive(orderItem?.length) ??
            toPositive(product?.length)
        let width =
            toPositive(variant?.width) ??
            toPositive(orderItem?.width) ??
            toPositive(product?.width)
        let height =
            toPositive(variant?.height) ??
            toPositive(orderItem?.height) ??
            toPositive(product?.height)

        const productId = product?.id ?? variant?.product_id ?? orderItem?.product_id
        const needsFetch = !weight || !length || !width || !height
        if (needsFetch && productId) {
            const fetched = await this.fetchProductDimensions(productId)
            weight = weight ?? fetched.weight
            length = length ?? fetched.length
            width = width ?? fetched.width
            height = height ?? fetched.height
        }

        if (!weight) {
            throw new Error(
                `Weight missing or invalid for variant ${variantId}. ShipStation requires accurate weights for all items.`
            )
        }

        return {
            weight,
            length: length ?? 0,
            width: width ?? 0,
            height: height ?? 0,
        }
    }

    async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
        return [
            { id: "ss-uk-flat", name: "ShipStation UK (Admin)" },
            { id: "ss-intl-flat", name: "ShipStation International (Admin)" },
        ]
    }

    async validateFulfillmentData(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        _context: ValidateFulfillmentDataContext
    ): Promise<Record<string, unknown>> {
        return { ...optionData, ...data }
    }

    async validateOption(_data: Record<string, unknown>): Promise<boolean> {
        return true
    }

    async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
        return false
    }

    async calculatePrice(
        _optionData: CalculateShippingOptionPriceDTO["optionData"],
        _data: CalculateShippingOptionPriceDTO["data"],
        _context: CalculateShippingOptionPriceDTO["context"]
    ): Promise<CalculatedShippingOptionPrice> {
        return {
            calculated_amount: 500,
            is_calculated_price_tax_inclusive: true,
        }
    }

    private mapAddress(
        addr: Partial<FulfillmentOrderDTO>["shipping_address"] | undefined,
        email?: string | null
    ): ShipStationAddress {
        const a = (addr ?? {}) as Record<string, unknown>
        const firstName = (a.first_name as string) || ""
        const lastName = (a.last_name as string) || ""
        const fullName = `${firstName} ${lastName}`.trim() || (email ?? "")
        const country = (a.country_code as string) || ""
        return {
            name: fullName,
            phone: (a.phone as string) || undefined,
            email: email ?? undefined,
            company_name: (a.company as string) || undefined,
            address_line1: (a.address_1 as string) || "",
            address_line2: (a.address_2 as string) || undefined,
            city_locality: (a.city as string) || "",
            state_province: (a.province as string) || undefined,
            postal_code: (a.postal_code as string) || "",
            country_code: country ? country.toUpperCase() : "",
        }
    }

    async createFulfillment(
        _data: Record<string, unknown>,
        items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
        order: Partial<FulfillmentOrderDTO> | undefined,
        fulfillment: Partial<
            Omit<FulfillmentDTO, "provider_id" | "data" | "items">
        >
    ): Promise<CreateFulfillmentResult> {
        try {
            const fulfillmentData =
                (fulfillment as { data?: Record<string, unknown> }).data ?? {}

            const existingShipmentId = fulfillmentData.ssShipmentId as
                | string
                | undefined
            if (existingShipmentId) {
                this.logger_.info(
                    `[ShipStation] Skipping createShipment — existing ssShipmentId=${existingShipmentId} on fulfillment ${fulfillment.id}`
                )
                return {
                    data: { ...fulfillmentData, ssShipmentId: existingShipmentId },
                    labels: [],
                }
            }

            if (!this.warehouseId_ && !this.shipFromFallback_) {
                throw new Error(
                    "[ShipStation] No warehouseId or shipFromFallback configured — cannot create shipment."
                )
            }

            let totalWeight = 0
            let maxL = 0
            let maxW = 0
            let totalH = 0

            const orderItems = (order?.items ?? []) as HydratedItem[]

            const resolvedContents: ResolvedItem[] = await Promise.all(
                items.map(async (rawItem) => {
                    const item = rawItem as HydratedItem & {
                        quantity?: number
                        title?: string | null
                        sku?: string | null
                    }
                    const lineItemId = item.line_item_id
                    const orderItem = orderItems.find((i) => i.id === lineItemId)
                    const variantId =
                        orderItem?.variant_id ?? item.variant_id ?? undefined

                    const stats = await this.getSmartWeight(
                        variantId ?? undefined,
                        order,
                        toPositive(item.weight) ??
                            toPositive(orderItem?.variant?.weight)
                    )

                    const qty = item.quantity ?? 1
                    totalWeight += stats.weight * qty
                    maxL = Math.max(maxL, stats.length)
                    maxW = Math.max(maxW, stats.width)
                    totalH += stats.height * qty

                    return {
                        name: item.title ?? orderItem?.title ?? "Item",
                        sku: item.sku ?? orderItem?.variant?.sku ?? undefined,
                        quantity: qty,
                        unitPrice: Number(
                            item.unit_price ?? orderItem?.unit_price ?? 0
                        ),
                        unitWeightInGrams: stats.weight,
                    }
                })
            )

            const ssItems: ShipStationPackageItem[] = resolvedContents.map((c) => ({
                name: c.name,
                sku: c.sku,
                quantity: c.quantity,
                total_value: {
                    amount: c.unitPrice * c.quantity,
                    currency: (order?.currency_code || "gbp").toUpperCase(),
                },
            }))

            const pkg: ShipStationPackage = {
                package_code: "package",
                weight: { value: Math.max(1, totalWeight), unit: "gram" },
                dimensions:
                    maxL || maxW || totalH
                        ? {
                              unit: "centimeter",
                              length: Math.max(1, maxL),
                              width: Math.max(1, maxW),
                              height: Math.max(1, totalH),
                          }
                        : undefined,
                content_description: resolvedContents
                    .map((c) => `${c.quantity}x ${c.name}`)
                    .join(", ")
                    .slice(0, 250),
            }

            const externalShipmentId = `medusa-${fulfillment.id ?? order?.id}`
            const externalOrderId = String(order?.display_id ?? order?.id ?? "")

            const shipTo = this.mapAddress(
                order?.shipping_address,
                order?.email
            )

            const shipment: ShipStationCreateShipment = {
                external_shipment_id: externalShipmentId,
                external_order_id: externalOrderId || undefined,
                ship_to: shipTo,
                ...(this.warehouseId_
                    ? { warehouse_id: this.warehouseId_ }
                    : { ship_from: this.shipFromFallback_! }),
                packages: [pkg],
                items: ssItems,
                create_sales_order: true,
                shipment_status: "pending",
            }

            this.logger_.info(
                `[ShipStation] Creating shipment external_shipment_id=${externalShipmentId} external_order_id=${externalOrderId}`
            )

            const created = await this.client.createShipment(shipment)

            this.logger_.info(
                `[ShipStation] Shipment created. shipment_id=${created.shipment_id} sales_order_id=${created.sales_order_id ?? "(none)"}`
            )

            return {
                data: {
                    ...fulfillmentData,
                    ssShipmentId: created.shipment_id,
                    ssSalesOrderId: created.sales_order_id,
                    ssExternalShipmentId: externalShipmentId,
                },
                labels: [],
            }
        } catch (e: any) {
            this.logger_.error(
                `[ShipStation] Failed to create fulfillment ${fulfillment.id}: ${e?.message ?? e}`
            )
            throw e
        }
    }

    async cancelFulfillment(
        fulfillment: Partial<
            Omit<FulfillmentDTO, "provider_id" | "data" | "items">
        >
    ): Promise<any> {
        const fulfillmentData =
            ((fulfillment as { data?: Record<string, unknown> }).data ?? {}) as Record<
                string,
                unknown
            >
        const ssShipmentId = fulfillmentData.ssShipmentId as string | undefined

        if (!ssShipmentId) {
            this.logger_.info(
                `[ShipStation] cancelFulfillment: no ssShipmentId on fulfillment ${fulfillment.id} — nothing to cancel.`
            )
            return {}
        }

        try {
            await this.client.cancelShipment(ssShipmentId)
            this.logger_.info(
                `[ShipStation] Cancelled shipment ${ssShipmentId} for fulfillment ${fulfillment.id}.`
            )
        } catch (e: any) {
            this.logger_.error(
                `[ShipStation] Failed to cancel shipment ${ssShipmentId} for fulfillment ${fulfillment.id}: ${e?.message ?? e}`
            )
        }
        return {}
    }
}
