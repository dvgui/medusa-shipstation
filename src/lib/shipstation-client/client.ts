import { Logger } from "@medusajs/framework/types"
import {
    SHIPSTATION_API_URL,
    ShipStationClientOptions,
    ShipStationCreateShipment,
    ShipStationCreateShipmentsResponse,
    ShipStationLabel,
    ShipStationListCarriersResponse,
    ShipStationListShipmentsResponse,
    ShipStationListWebhooksResponse,
    ShipStationRateResponse,
    ShipStationShipment,
    ShipStationSubscribeWebhookInput,
    ShipStationWebhookSubscription,
} from "./types"

/**
 * Thin wrapper around the ShipStation v2 REST API.
 *
 * Authentication: a single `API-Key` header. No basic-auth / no secret.
 *
 * Base URL: https://api.shipstation.com/v2
 *
 * Docs: https://docs.shipstation.com/
 */
export class ShipStationClient {
    private apiKey_: string
    private logger_: Logger

    constructor(options: ShipStationClientOptions, logger: Logger) {
        this.apiKey_ = options.apiKey
        this.logger_ = logger
    }

    private async request<T>(
        path: string,
        method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
        body?: unknown
    ): Promise<T> {
        const url = path.startsWith("http")
            ? path
            : `${SHIPSTATION_API_URL}${path}`

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "API-Key": this.apiKey_,
                },
                body: body ? JSON.stringify(body) : undefined,
            })

            if (!response.ok) {
                const errorData = await response.text()
                throw new Error(
                    `ShipStation API Error: ${response.status} ${response.statusText} - ${errorData}`
                )
            }

            const text = await response.text()
            if (!text) {
                return undefined as unknown as T
            }
            return JSON.parse(text) as T
        } catch (error: any) {
            this.logger_.error(
                `ShipStationClient ${method} ${path} failed: ${error.message}`
            )
            throw error
        }
    }

    /**
     * Creates one shipment in ShipStation. Pass `create_sales_order: true` on
     * the shipment so it appears in the Orders tab for the admin to buy a
     * label on.
     */
    async createShipment(
        shipment: ShipStationCreateShipment
    ): Promise<ShipStationShipment> {
        const response = await this.request<ShipStationCreateShipmentsResponse>(
            "/shipments",
            "POST",
            { shipments: [shipment] }
        )

        const created = response.shipments?.[0]
        if (!created || (response.has_errors && created.errors?.length)) {
            const msg = created?.errors
                ?.map((e) => e.message ?? `${e.error_code}`)
                .join("; ")
            throw new Error(
                `ShipStation createShipment failed${msg ? `: ${msg}` : ""}`
            )
        }
        return created
    }

    async getShipment(shipmentId: string): Promise<ShipStationShipment | null> {
        try {
            return await this.request<ShipStationShipment>(
                `/shipments/${shipmentId}`,
                "GET"
            )
        } catch (e: any) {
            if ((e?.message ?? "").includes(" 404 ")) return null
            throw e
        }
    }

    /**
     * Looks up shipments by our `external_shipment_id` (which we set to
     * `medusa-{fulfillmentId}` on create).
     */
    async listShipmentsByExternalId(
        externalShipmentId: string
    ): Promise<ShipStationListShipmentsResponse> {
        const qs = new URLSearchParams({
            external_shipment_id: externalShipmentId,
        }).toString()
        return this.request<ShipStationListShipmentsResponse>(
            `/shipments?${qs}`,
            "GET"
        )
    }

    async cancelShipment(shipmentId: string): Promise<void> {
        // v2 exposes a dedicated cancel endpoint on shipments. It rejects
        // requests without Content-Length (HTTP 411), so we send {} as the
        // body rather than undefined.
        await this.request<void>(
            `/shipments/${shipmentId}/cancel`,
            "PUT",
            {}
        )
    }

    /**
     * Returns shipping rates for a persisted v2 shipment. The caller passes
     * an optional list of carrier_ids to filter — otherwise ShipStation
     * returns rates from every connected carrier that supports the lane.
     *
     * Note: /v2/shipments/{id}/rates is blocked on Basic plans (405), so we
     * always use the top-level /v2/rates endpoint with shipment_id in the
     * body — works across plans.
     */
    async getRatesForShipment(
        shipmentId: string,
        options?: { carrier_ids?: string[] }
    ): Promise<ShipStationRateResponse> {
        return this.request<ShipStationRateResponse>("/rates", "POST", {
            shipment_id: shipmentId,
            rate_options: {
                carrier_ids: options?.carrier_ids ?? [],
            },
        })
    }

    /**
     * Purchases a label from a rate_id returned by getRatesForShipment.
     * Label metadata includes tracking_number, carrier_code, service_code,
     * and label_download URLs.
     */
    async buyLabelFromRate(
        rateId: string,
        options?: {
            label_format?: "pdf" | "png" | "zpl"
            label_layout?: "4x6" | "letter"
            label_download_type?: "url" | "inline"
        }
    ): Promise<ShipStationLabel> {
        return this.request<ShipStationLabel>(
            `/labels/rates/${rateId}`,
            "POST",
            {
                label_format: options?.label_format ?? "pdf",
                label_layout: options?.label_layout ?? "4x6",
                label_download_type: options?.label_download_type ?? "url",
            }
        )
    }

    async getLabel(labelId: string): Promise<ShipStationLabel> {
        return this.request<ShipStationLabel>(`/labels/${labelId}`, "GET")
    }

    async voidLabel(labelId: string): Promise<{ approved: boolean; message?: string }> {
        return this.request<{ approved: boolean; message?: string }>(
            `/labels/${labelId}/void`,
            "PUT",
            {}
        )
    }

    async listCarriers(): Promise<ShipStationListCarriersResponse> {
        return this.request<ShipStationListCarriersResponse>("/carriers", "GET")
    }

    async listWebhooks(): Promise<ShipStationListWebhooksResponse> {
        // v2 returns a bare array. Guard against accidental wrapping by
        // upstream changes.
        const raw = await this.request<unknown>("/environment/webhooks", "GET")
        if (Array.isArray(raw)) {
            return raw as ShipStationListWebhooksResponse
        }
        if (raw && typeof raw === "object" && "webhooks" in raw) {
            return (raw as { webhooks: ShipStationListWebhooksResponse }).webhooks
        }
        return []
    }

    async subscribeWebhook(
        input: ShipStationSubscribeWebhookInput
    ): Promise<ShipStationWebhookSubscription> {
        return this.request<ShipStationWebhookSubscription>(
            "/environment/webhooks",
            "POST",
            input
        )
    }

    async unsubscribeWebhook(webhookId: string): Promise<void> {
        await this.request<void>(`/environment/webhooks/${webhookId}`, "DELETE")
    }

    /**
     * Builds a public tracking URL from a carrier code and tracking number.
     * v2 uses carrier_id (opaque string like `se-12345`) so we try to infer
     * by carrier_code string when ShipStation provides it in webhook
     * payloads. Returns "" for unknown carriers.
     */
    static trackingUrlFor(
        carrierCode: string | null | undefined,
        trackingNumber: string | null | undefined
    ): string {
        if (!trackingNumber) return ""
        const tn = trackingNumber.replace(/\s+/g, "")
        const cc = (carrierCode || "").toLowerCase().trim()

        switch (cc) {
            case "ups":
            case "ups_walleted":
                return `https://www.ups.com/track?tracknum=${tn}`
            case "fedex":
            case "fedex_walleted":
                return `https://www.fedex.com/fedextrack/?trknbr=${tn}`
            case "stamps_com":
            case "usps":
            case "endicia":
                return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
            case "dhl_express":
            case "dhl_express_worldwide":
                return `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`
            case "dhl_ecommerce":
            case "globegistics":
                return `https://webtrack.dhlglobalmail.com/?trackingnumber=${tn}`
            case "royal_mail":
            case "royal_mail_uk":
            case "royalmail":
                return `https://www.royalmail.com/track-your-item#/tracking-results/${tn}`
            case "evri":
            case "hermes":
            case "myhermes":
                return `https://www.evri.com/track/parcel/${tn.replace(/:/g, "")}/details`
            case "dpd":
            case "dpd_uk":
                return `https://track.dpd.co.uk/parcels/${tn}`
            case "yodel":
                return `https://www.yodel.co.uk/tracking/${tn}`
            case "canada_post":
                return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${tn}`
            case "ontrac":
                return `https://www.ontrac.com/trackingresults.asp?tracking_number=${tn}`
            default:
                return ""
        }
    }

    /** Humanises a ShipStation carrier code for display in emails / UI. */
    static humanCarrier(carrierCode: string | null | undefined): string {
        const cc = (carrierCode || "").toLowerCase().trim()
        switch (cc) {
            case "ups":
            case "ups_walleted":
                return "UPS"
            case "fedex":
            case "fedex_walleted":
                return "FedEx"
            case "stamps_com":
            case "usps":
            case "endicia":
                return "USPS"
            case "dhl_express":
            case "dhl_express_worldwide":
                return "DHL Express"
            case "dhl_ecommerce":
            case "globegistics":
                return "DHL eCommerce"
            case "royal_mail":
            case "royal_mail_uk":
            case "royalmail":
                return "Royal Mail"
            case "evri":
            case "hermes":
            case "myhermes":
                return "Evri"
            case "dpd":
            case "dpd_uk":
                return "DPD"
            case "yodel":
                return "Yodel"
            case "canada_post":
                return "Canada Post"
            case "ontrac":
                return "OnTrac"
            default:
                if (!cc) return "your carrier"
                return cc
                    .split(/[_\s]+/)
                    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ""))
                    .join(" ")
        }
    }
}
