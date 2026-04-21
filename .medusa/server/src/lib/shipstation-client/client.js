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
     * Builds a public tracking URL from a carrier code and tracking number.
     * v2 uses carrier_id (opaque string like `se-12345`) so we try to infer
     * by carrier_code string when ShipStation provides it in webhook
     * payloads. Returns "" for unknown carriers.
     */
    static trackingUrlFor(carrierCode, trackingNumber) {
        if (!trackingNumber)
            return "";
        const tn = trackingNumber.replace(/\s+/g, "");
        const cc = (carrierCode || "").toLowerCase().trim();
        switch (cc) {
            case "ups":
            case "ups_walleted":
                return `https://www.ups.com/track?tracknum=${tn}`;
            case "fedex":
            case "fedex_walleted":
                return `https://www.fedex.com/fedextrack/?trknbr=${tn}`;
            case "stamps_com":
            case "usps":
            case "endicia":
                return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`;
            case "dhl_express":
            case "dhl_express_worldwide":
                return `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`;
            case "dhl_ecommerce":
            case "globegistics":
                return `https://webtrack.dhlglobalmail.com/?trackingnumber=${tn}`;
            case "royal_mail":
            case "royal_mail_uk":
            case "royalmail":
                return `https://www.royalmail.com/track-your-item#/tracking-results/${tn}`;
            case "evri":
            case "hermes":
            case "myhermes":
                return `https://www.evri.com/track/parcel/${tn.replace(/:/g, "")}/details`;
            case "dpd":
            case "dpd_uk":
                return `https://track.dpd.co.uk/parcels/${tn}`;
            case "yodel":
                return `https://www.yodel.co.uk/tracking/${tn}`;
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
        const cc = (carrierCode || "").toLowerCase().trim();
        switch (cc) {
            case "ups":
            case "ups_walleted":
                return "UPS";
            case "fedex":
            case "fedex_walleted":
                return "FedEx";
            case "stamps_com":
            case "usps":
            case "endicia":
                return "USPS";
            case "dhl_express":
            case "dhl_express_worldwide":
                return "DHL Express";
            case "dhl_ecommerce":
            case "globegistics":
                return "DHL eCommerce";
            case "royal_mail":
            case "royal_mail_uk":
            case "royalmail":
                return "Royal Mail";
            case "evri":
            case "hermes":
            case "myhermes":
                return "Evri";
            case "dpd":
            case "dpd_uk":
                return "DPD";
            case "yodel":
                return "Yodel";
            case "canada_post":
                return "Canada Post";
            case "ontrac":
                return "OnTrac";
            default:
                if (!cc)
                    return "your carrier";
                return cc
                    .split(/[_\s]+/)
                    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
                    .join(" ");
        }
    }
}
exports.ShipStationClient = ShipStationClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2xpYi9zaGlwc3RhdGlvbi1jbGllbnQvY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQVVnQjtBQUVoQjs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsaUJBQWlCO0lBSTFCLFlBQVksT0FBaUMsRUFBRSxNQUFjO1FBQ3pELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtRQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN6QixDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FDakIsSUFBWSxFQUNaLE1BQW1ELEVBQ25ELElBQWM7UUFFZCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUMvQixDQUFDLENBQUMsSUFBSTtZQUNOLENBQUMsQ0FBQyxHQUFHLDJCQUFtQixHQUFHLElBQUksRUFBRSxDQUFBO1FBRXJDLElBQUksQ0FBQztZQUNELE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsRUFBRTtnQkFDOUIsTUFBTTtnQkFDTixPQUFPLEVBQUU7b0JBQ0wsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsTUFBTSxFQUFFLGtCQUFrQjtvQkFDMUIsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPO2lCQUMxQjtnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2FBQ2hELENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxTQUFTLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQ1gsMEJBQTBCLFFBQVEsQ0FBQyxNQUFNLElBQUks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