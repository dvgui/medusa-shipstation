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

export type ShipStationMoney = {
    currency: string
    amount: number
}

export type ShipStationRate = {
    rate_id: string
    rate_type?: "check" | "shipment"
    carrier_id: string
    shipping_amount: ShipStationMoney
    insurance_amount?: ShipStationMoney
    confirmation_amount?: ShipStationMoney
    other_amount?: ShipStationMoney
    tax_amount?: ShipStationMoney
    zone?: number
    package_type?: string
    delivery_days?: number | null
    guaranteed_service?: boolean
    estimated_delivery_date?: string | null
    carrier_delivery_days?: string | null
    ship_date?: string | null
    negotiated_rate?: boolean
    service_type?: string
    service_code?: string
    trackable?: boolean
    carrier_code?: string
    carrier_nickname?: string
    carrier_friendly_name?: string
    validation_status?: "valid" | "invalid" | "has_warnings" | "unknown"
    warning_messages?: string[]
    error_messages?: string[]
}

export type ShipStationRateResponse = {
    rate_response: {
        rates: ShipStationRate[]
        invalid_rates?: ShipStationRate[]
        rate_request_id?: string
        shipment_id?: string
        created_at?: string
        status?: "working" | "completed" | "partial" | "error"
        errors?: Array<{
            error_source?: string
            error_type?: string
            error_code?: string
            message?: string
            carrier_id?: string
            carrier_code?: string
            carrier_name?: string
        }>
    }
    shipment_id?: string
    [key: string]: unknown
}

export type ShipStationLabelDownload = {
    pdf?: string
    png?: string
    zpl?: string
    href?: string
}

export type ShipStationLabel = {
    label_id: string
    status: "processing" | "completed" | "error" | "voided"
    shipment_id: string
    ship_date?: string
    created_at?: string
    shipment_cost?: ShipStationMoney
    insurance_cost?: ShipStationMoney
    requested_comparison_amount?: ShipStationMoney
    tracking_number?: string | null
    is_return_label?: boolean
    rma_number?: string | null
    is_international?: boolean
    batch_id?: string | null
    carrier_id?: string
    carrier_code?: string
    service_code?: string
    package_code?: string
    voided?: boolean
    voided_at?: string | null
    label_format?: "pdf" | "png" | "zpl"
    display_scheme?: string
    label_layout?: string
    trackable?: boolean
    label_download?: ShipStationLabelDownload
    form_download?: ShipStationLabelDownload
    insurance_claim?: unknown
    packages?: Array<Record<string, unknown>>
}

export type ShipStationCarrier = {
    carrier_id: string
    carrier_code?: string
    account_number?: string
    requires_funded_amount?: boolean
    balance?: number
    nickname?: string
    friendly_name?: string
    primary?: boolean
    has_multi_package_supporting_services?: boolean
    allows_returns?: boolean
    supports_prepaid_duties_taxes?: boolean
    supports_label_messages?: boolean
    disabled_by_billing_plan?: boolean
    services?: Array<{
        carrier_id?: string
        carrier_code?: string
        service_code?: string
        name?: string
        domestic?: boolean
        international?: boolean
        is_multi_package_supported?: boolean
    }>
}

export type ShipStationListCarriersResponse = {
    carriers: ShipStationCarrier[]
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
