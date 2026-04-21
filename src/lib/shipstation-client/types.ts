export const SHIPSTATION_API_URL = "https://api.shipstation.com/v2"

export type ShipStationClientOptions = {
    apiKey: string
}

export type ShipStationWeightUnit = "pound" | "ounce" | "gram" | "kilogram"
export type ShipStationDimensionUnit = "inch" | "centimeter"

export type ShipStationWeight = {
    value: number
    unit: ShipStationWeightUnit
}

export type ShipStationDimensions = {
    unit: ShipStationDimensionUnit
    length: number
    width: number
    height: number
}

export type ShipStationAddress = {
    name: string
    phone?: string
    email?: string
    company_name?: string
    address_line1: string
    address_line2?: string
    address_line3?: string
    city_locality: string
    state_province?: string
    postal_code: string
    country_code: string
    address_residential_indicator?: "yes" | "no" | "unknown"
}

export type ShipStationPackageItem = {
    name?: string
    sales_order_id?: string
    sales_order_item_id?: string
    quantity?: number
    total_value?: { amount: number; currency: string } | number
    sku?: string
    external_order_id?: string
    external_order_item_id?: string
}

export type ShipStationPackage = {
    package_code?: string
    weight: ShipStationWeight
    dimensions?: ShipStationDimensions
    insured_value?: { amount: number; currency: string }
    label_messages?: {
        reference1?: string
        reference2?: string
        reference3?: string
    }
    external_package_id?: string
    content_description?: string
}

export type ShipStationShipmentStatus =
    | "pending"
    | "processing"
    | "label_purchased"
    | "cancelled"

export type ShipStationCreateShipment = {
    external_shipment_id?: string
    external_order_id?: string
    ship_date?: string
    ship_to: ShipStationAddress
    ship_from?: ShipStationAddress
    warehouse_id?: string
    carrier_id?: string
    service_code?: string
    packages: ShipStationPackage[]
    confirmation?: string
    order_source_code?: string
    items?: ShipStationPackageItem[]
    advanced_options?: Record<string, unknown>
    /**
     * Flag that makes the created shipment show up in ShipStation's Orders
     * tab. Without this a v2 shipment is a pure label-prep object and is
     * invisible to the dashboard UI.
     */
    create_sales_order?: boolean
    shipment_status?: ShipStationShipmentStatus
    customs?: Record<string, unknown>
}

export type ShipStationShipment = ShipStationCreateShipment & {
    shipment_id: string
    sales_order_id?: string
    status?: string
    shipment_status?: ShipStationShipmentStatus
    carrier_id?: string
    created_at?: string
    modified_at?: string
    tracking_number?: string | null
    tracking_status?: string
    is_return?: boolean
}

export type ShipStationCreateShipmentsResponse = {
    has_errors: boolean
    shipments: Array<
        ShipStationShipment & {
            errors?: Array<{ error_source?: string; error_type?: string; error_code?: string; message?: string }>
        }
    >
}

export type ShipStationListShipmentsResponse = {
    shipments: ShipStationShipment[]
    total?: number
    page?: number
    pages?: number
    links?: Record<string, { href: string }>
}

/**
 * v2 webhook events. Only the subset we care about is narrowly typed; the
 * others remain as string literals for completeness.
 */
export type ShipStationWebhookEvent =
    | "fulfillment_shipped_v2"
    | "fulfillment_rejected_v2"
    | "batch_processed_v2"
    | "track"
    | "batch"
    | "carrier_connected"
    | "order_source_refresh_complete"
    | "rate"
    | "report_complete"
    | "sales_orders_imported"

export type ShipStationSubscribeWebhookInput = {
    name: string
    event: ShipStationWebhookEvent
    url: string
    headers?: Array<{ key: string; value: string }>
    store_id?: string | number
}

export type ShipStationWebhookSubscription = {
    webhook_id: string
    name?: string
    event: ShipStationWebhookEvent
    url: string
    headers?: Array<{ key: string; value: string }>
    store_id?: string | number | null
    is_active?: boolean
    created_at?: string
    modified_at?: string
}

/**
 * v2 returns a bare array for GET /v2/environment/webhooks — not wrapped in
 * any envelope. We type the alias for readability.
 */
export type ShipStationListWebhooksResponse = ShipStationWebhookSubscription[]

/**
 * Outer body shape ShipStation posts to our webhook endpoint for the events
 * we care about. Different events carry different `data` shapes.
 */
export type ShipStationWebhookDelivery<T = unknown> = {
    resource_url?: string
    resource_type: ShipStationWebhookEvent | string
    data?: T
}

/**
 * Payload shape for `fulfillment_shipped_v2`. We don't rely on every field —
 * the handler re-fetches the shipment from the API to avoid trusting the POST
 * body.
 */
export type ShipStationFulfillmentShippedData = {
    shipment_id?: string
    external_shipment_id?: string
    sales_order_id?: string
    tracking_number?: string
    carrier_id?: string
    service_code?: string
    shipped_at?: string
}

// See ShipStation API v2 docs: https://docs.shipstation.com/
