"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipStationClient = void 0;
const types_1 = require("./types");
/**
 * Thin wrapper around the ShipStation v2 REST API.
 *
 * Authentication: a single `API-Key` header. No basic-auth / no secret.
 *
 * Base URL: https://api.shipstation.com/v2
 *
 * Docs: https://docs.shipstation.com/
 */
class ShipStationClient {
    constructor(options, logger) {
        this.apiKey_ = options.apiKey;
        this.logger_ = logger;
    }
    async request(path, method, body) {
        const url = path.startsWith("http")
            ? path
            : `${types_1.SHIPSTATION_API_URL}${path}`;
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "API-Key": this.apiKey_,
                },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`ShipStation API Error: ${response.status} ${response.statusText} - ${errorData}`);
            }
            const text = await response.text();
            if (!text) {
                return undefined;
            }
            return JSON.parse(text);
        }
        catch (error) {
            this.logger_.error(`ShipStationClient ${method} ${path} failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Creates one shipment in ShipStation. Pass `create_sales_order: true` on
     * the shipment so it appears in the Orders tab for the admin to buy a
     * label on.
     */
    async createShipment(shipment) {
        const response = await this.request("/shipments", "POST", { shipments: [shipment] });
        const created = response.shipments?.[0];
        if (!created || (response.has_errors && created.errors?.length)) {
            const msg = created?.errors
                ?.map((e) => e.message ?? `${e.error_code}`)
                .join("; ");
            throw new Error(`ShipStation createShipment failed${msg ? `: ${msg}` : ""}`);
        }
        return created;
    }
    async getShipment(shipmentId) {
        try {
            return await this.request(`/shipments/${shipmentId}`, "GET");
        }
        catch (e) {
            if ((e?.message ?? "").includes(" 404 "))
                return null;
            throw e;
        }
    }
    /**
     * Looks up shipments by our `external_shipment_id` (which we set to
     * `medusa-{fulfillmentId}` on create).
     */
    async listShipmentsByExternalId(externalShipmentId) {
        const qs = new URLSearchParams({
            external_shipment_id: externalShipmentId,
        }).toString();
        return this.request(`/shipments?${qs}`, "GET");
    }
    async cancelShipment(shipmentId) {
        // v2 exposes a dedicated cancel endpoint on shipments. It rejects
        // requests without Content-Length (HTTP 411), so we send {} as the
        // body rather than undefined.
        await this.request(`/shipments/${shipmentId}/cancel`, "PUT", {});
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
    async getRatesForShipment(shipmentId, options) {
        return this.request("/rates", "POST", {
            shipment_id: shipmentId,
            rate_options: {
                carrier_ids: options?.carrier_ids ?? [],
            },
        });
    }
    /**
     * Purchases a label from a rate_id returned by getRatesForShipment.
     * Label metadata includes tracking_number, carrier_code, service_code,
     * and label_download URLs.
     */
    async buyLabelFromRate(rateId, options) {
        return this.request(`/labels/rates/${rateId}`, "POST", {
            label_format: options?.label_format ?? "pdf",
            label_layout: options?.label_layout ?? "4x6",
            label_download_type: options?.label_download_type ?? "url",
        });
    }
    async getLabel(labelId) {
        return this.request(`/labels/${labelId}`, "GET");
    }
    async voidLabel(labelId) {
        return this.request(`/labels/${labelId}/void`, "PUT", {});
    }
    async listCarriers() {
        return this.request("/carriers", "GET");
    }
    async listWebhooks() {
        // v2 returns a bare array. Guard against accidental wrapping by
        // upstream changes.
        const raw = await this.request("/environment/webhooks", "GET");
        if (Array.isArray(raw)) {
            return raw;
        }
        if (raw && typeof raw === "object" && "webhooks" in raw) {
            return raw.webhooks;
        }
        return [];
    }
    async subscribeWebhook(input) {
        return this.request("/environment/webhooks", "POST", input);
    }
    async unsubscribeWebhook(webhookId) {
        await this.request(`/environment/webhooks/${webhookId}`, "DELETE");
    }
    /**
     * Normalises ShipStation v2 carrier_code variants down to a canonical
     * carrier name. ShipStation Carrier Services accounts add suffixes like
     * `_walleted`, `_cnd_walleted`, `wallet`, etc. — strip them so the
     * tracking-URL/humanCarrier maps don't have to enumerate every variant.
     *
     * Examples:
     *   rm_cnd_walleted   → royal_mail
     *   pf_cnd_walleted   → parcelforce
     *   dpdwallet         → dpd
     *   yodel_walleted    → yodel
     *   fedex_uk_walleted → fedex_uk
     *   hermes            → evri
     */
    static normalizeCarrierCode(carrierCode) {
        const raw = (carrierCode || "").toLowerCase().trim();
        if (!raw)
            return "";
        // Strip the SCS account suffixes — order matters (longest first).
        let cc = raw
            .replace(/_cnd_walleted$/, "")
            .replace(/_walleted$/, "")
            .replace(/wallet$/, "");
        // Map ShipStation's short codes to canonical names.
        const aliases = {
            rm: "royal_mail",
            pf: "parcelforce",
            dpd: "dpd",
            yodel: "yodel",
            hermes: "evri",
            myhermes: "evri",
            fedex_uk: "fedex_uk",
            ups: "ups",
            fedex: "fedex",
            stamps_com: "usps",
            endicia: "usps",
            usps: "usps",
            dhl_express: "dhl_express",
            dhl_express_worldwide: "dhl_express",
            dhl_express_mydhl: "dhl_express",
            dhl_ecommerce: "dhl_ecommerce",
            globegistics: "dhl_ecommerce",
            globalpost: "globalpost",
            canada_post: "canada_post",
            ontrac: "ontrac",
        };
        return aliases[cc] ?? cc;
    }
    /**
     * Builds a public tracking URL from a carrier code and tracking number.
     * Accepts any ShipStation v2 carrier_code variant (raw or normalised).
     * Returns "" for unknown carriers — the email template degrades to
     * "see details in store".
     */
    static trackingUrlFor(carrierCode, trackingNumber) {
        if (!trackingNumber)
            return "";
        const tn = trackingNumber.replace(/\s+/g, "");
        const cc = ShipStationClient.normalizeCarrierCode(carrierCode);
        switch (cc) {
            case "ups":
                return `https://www.ups.com/track?tracknum=${tn}`;
            case "fedex":
                return `https://www.fedex.com/fedextrack/?trknbr=${tn}`;
            case "fedex_uk":
                return `https://www.fedex.com/fedextrack/?trknbr=${tn}`;
            case "usps":
                return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`;
            case "dhl_express":
                return `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`;
            case "dhl_ecommerce":
                return `https://webtrack.dhlglobalmail.com/?trackingnumber=${tn}`;
            case "royal_mail":
                return `https://www.royalmail.com/track-your-item#/tracking-results/${tn}`;
            case "parcelforce":
                return `https://www.parcelforce.com/track-trace?trackNumber=${tn}`;
            case "evri":
                return `https://www.evri.com/track/parcel/${tn.replace(/:/g, "")}/details`;
            case "dpd":
                return `https://track.dpd.co.uk/parcels/${tn}`;
            case "yodel":
                return `https://www.yodel.co.uk/tracking/${tn}`;
            case "globalpost":
                return `https://parceltracking.gpsworld.com/?TrackingId=${tn}`;
            case "canada_post":
                return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${tn}`;
            case "ontrac":
                return `https://www.ontrac.com/trackingresults.asp?tracking_number=${tn}`;
            default:
                return "";
        }
    }
    /** Humanises a ShipStation carrier code for display in emails / UI. */
    static humanCarrier(carrierCode) {
        const raw = (carrierCode || "").toLowerCase().trim();
        if (!raw)
            return "your carrier";
        const cc = ShipStationClient.normalizeCarrierCode(raw);
        switch (cc) {
            case "ups":
                return "UPS";
            case "fedex":
                return "FedEx";
            case "fedex_uk":
                return "FedEx UK";
            case "usps":
                return "USPS";
            case "dhl_express":
                return "DHL Express";
            case "dhl_ecommerce":
                return "DHL eCommerce";
            case "royal_mail":
                return "Royal Mail";
            case "parcelforce":
                return "Parcelforce";
            case "evri":
                return "Evri";
            case "dpd":
                return "DPD";
            case "yodel":
                return "Yodel";
            case "globalpost":
                return "GlobalPost";
            case "canada_post":
                return "Canada Post";
            case "ontrac":
                return "OnTrac";
            default:
                return cc
                    .split(/[_\s]+/)
                    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
                    .join(" ");
        }
    }
}
exports.ShipStationClient = ShipStationClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2xpYi9zaGlwc3RhdGlvbi1jbGllbnQvY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQWFnQjtBQUVoQjs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsaUJBQWlCO0lBSTFCLFlBQVksT0FBaUMsRUFBRSxNQUFjO1FBQ3pELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN6QixDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FDakIsSUFBWSxFQUNaLE1BQW1ELEVBQ25ELElBQWM7UUFFZCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUMvQixDQUFDLENBQUMsSUFBSTtZQUNOLENBQUMsQ0FBQyxHQUFHLDJCQUFtQixHQUFHLElBQUksRUFBRSxDQUFBO1FBRXJDLElBQUksQ0FBQztZQUNELE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsRUFBRTtnQkFDOUIsTUFBTTtnQkFDTixPQUFPLEVBQUU7b0JBQ0wsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsTUFBTSxFQUFFLGtCQUFrQjtvQkFDMUIsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPO2lCQUMxQjtnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2FBQ2hELENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxTQUFTLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gsMEJBQTBCLFFBQVEsQ0FBQyxNQUFNLElBQUks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