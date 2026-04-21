"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipStationProviderService = void 0;
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("../../lib/shipstation-client/client");
const toPositive = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
};
const SHIPSTATION_PROVIDER_IDENTIFIER = "shipstation-fulfillment";
class ShipStationProviderService extends utils_1.AbstractFulfillmentProviderService {
    constructor(deps, options) {
        super();
        this.logger_ = deps.logger;
        try {
            this.query_ = deps[utils_1.ContainerRegistrationKeys.QUERY];
        }
        catch {
            this.query_ = undefined;
        }
        if (!options.apiKey) {
            this.logger_.warn("[ShipStation] apiKey missing in fulfillment module options.");
        }
        this.warehouseId_ = options.warehouseId;
        this.shipFromFallback_ = options.shipFromFallback;
        this.client = new client_1.ShipStationClient({ apiKey: options.apiKey }, this.logger_);
    }
    async fetchProductDimensions(productId) {
        if (!this.query_)
            return {};
        try {
            const { data } = await this.query_.graph({
                entity: "product",
                fields: ["id", "weight", "length", "width", "height"],
                filters: { id: productId },
            });
            const p = data?.[0];
            if (!p)
                return {};
            return {
                weight: toPositive(p.weight),
                length: toPositive(p.length),
                width: toPositive(p.width),
                height: toPositive(p.height),
            };
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            this.logger_.warn(`[ShipStation] Failed to fetch product ${productId} dimensions: ${message}`);
            return {};
        }
    }
    async getSmartWeight(variantId, order, currentWeight) {
        const items = (order?.items ?? []);
        const orderItem = variantId
            ? items.find((i) => i.variant_id === variantId)
            : undefined;
        const variant = orderItem?.variant ?? undefined;
        const product = variant?.product ?? undefined;
        let weight = toPositive(currentWeight) ??
            toPositive(variant?.weight) ??
            toPositive(orderItem?.weight) ??
            toPositive(product?.weight);
        let length = toPositive(variant?.length) ??
            toPositive(orderItem?.length) ??
            toPositive(product?.length);
        let width = toPositive(variant?.width) ??
            toPositive(orderItem?.width) ??
            toPositive(product?.width);
        let height = toPositive(variant?.height) ??
            toPositive(orderItem?.height) ??
            toPositive(product?.height);
        const productId = product?.id ?? variant?.product_id ?? orderItem?.product_id;
        const needsFetch = !weight || !length || !width || !height;
        if (needsFetch && productId) {
            const fetched = await this.fetchProductDimensions(productId);
            weight = weight ?? fetched.weight;
            length = length ?? fetched.length;
            width = width ?? fetched.width;
            height = height ?? fetched.height;
        }
        if (!weight) {
            throw new Error(`Weight missing or invalid for variant ${variantId}. ShipStation requires accurate weights for all items.`);
        }
        return {
            weight,
            length: length ?? 0,
            width: width ?? 0,
            height: height ?? 0,
        };
    }
    async getFulfillmentOptions() {
        return [
            { id: "ss-uk-flat", name: "ShipStation UK (Admin)" },
            { id: "ss-intl-flat", name: "ShipStation International (Admin)" },
        ];
    }
    async validateFulfillmentData(optionData, data, _context) {
        return { ...optionData, ...data };
    }
    async validateOption(_data) {
        return true;
    }
    async canCalculate(_data) {
        return false;
    }
    async calculatePrice(_optionData, _data, _context) {
        return {
            calculated_amount: 500,
            is_calculated_price_tax_inclusive: true,
        };
    }
    mapAddress(addr, email) {
        const a = (addr ?? {});
        const firstName = a.first_name || "";
        const lastName = a.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim() || (email ?? "");
        const country = a.country_code || "";
        return {
            name: fullName,
            phone: a.phone || undefined,
            email: email ?? undefined,
            company_name: a.company || undefined,
            address_line1: a.address_1 || "",
            address_line2: a.address_2 || undefined,
            city_locality: a.city || "",
            state_province: a.province || undefined,
            postal_code: a.postal_code || "",
            country_code: country ? country.toUpperCase() : "",
        };
    }
    async createFulfillment(_data, items, order, fulfillment) {
        try {
            const fulfillmentData = fulfillment.data ?? {};
            const existingShipmentId = fulfillmentData.ssShipmentId;
            if (existingShipmentId) {
                this.logger_.info(`[ShipStation] Skipping createShipment — existing ssShipmentId=${existingShipmentId} on fulfillment ${fulfillment.id}`);
                return {
                    data: { ...fulfillmentData, ssShipmentId: existingShipmentId },
                    labels: [],
                };
            }
            if (!this.warehouseId_ && !this.shipFromFallback_) {
                throw new Error("[ShipStation] No warehouseId or shipFromFallback configured — cannot create shipment.");
            }
            let totalWeight = 0;
            let maxL = 0;
            let maxW = 0;
            let totalH = 0;
            const orderItems = (order?.items ?? []);
            const resolvedContents = await Promise.all(items.map(async (rawItem) => {
                const item = rawItem;
                const lineItemId = item.line_item_id;
                const orderItem = orderItems.find((i) => i.id === lineItemId);
                const variantId = orderItem?.variant_id ?? item.variant_id ?? undefined;
                const stats = await this.getSmartWeight(variantId ?? undefined, order, toPositive(item.weight) ??
                    toPositive(orderItem?.variant?.weight));
                const qty = item.quantity ?? 1;
                totalWeight += stats.weight * qty;
                maxL = Math.max(maxL, stats.length);
                maxW = Math.max(maxW, stats.width);
                totalH += stats.height * qty;
                return {
                    name: item.title ?? orderItem?.title ?? "Item",
                    sku: item.sku ?? orderItem?.variant?.sku ?? undefined,
                    quantity: qty,
                    unitPrice: Number(item.unit_price ?? orderItem?.unit_price ?? 0),
                    unitWeightInGrams: stats.weight,
                };
            }));
            const ssItems = resolvedContents.map((c) => ({
                name: c.name,
                sku: c.sku,
                quantity: c.quantity,
                total_value: {
                    amount: c.unitPrice * c.quantity,
                    currency: (order?.currency_code || "gbp").toUpperCase(),
                },
            }));
            const pkg = {
                package_code: "package",
                weight: { value: Math.max(1, totalWeight), unit: "gram" },
                dimensions: maxL || maxW || totalH
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
            };
            const externalShipmentId = `medusa-${fulfillment.id ?? order?.id}`;
            const externalOrderId = String(order?.display_id ?? order?.id ?? "");
            const shipTo = this.mapAddress(order?.shipping_address, order?.email);
            const shipment = {
                external_shipment_id: externalShipmentId,
                external_order_id: externalOrderId || undefined,
                ship_to: shipTo,
                ...(this.warehouseId_
                    ? { warehouse_id: this.warehouseId_ }
                    : { ship_from: this.shipFromFallback_ }),
                packages: [pkg],
                items: ssItems,
                create_sales_order: true,
                shipment_status: "pending",
            };
            this.logger_.info(`[ShipStation] Creating shipment external_shipment_id=${externalShipmentId} external_order_id=${externalOrderId}`);
            const created = await this.client.createShipment(shipment);
            this.logger_.info(`[ShipStation] Shipment created. shipment_id=${created.shipment_id} sales_order_id=${created.sales_order_id ?? "(none)"}`);
            return {
                data: {
                    ...fulfillmentData,
                    ssShipmentId: created.shipment_id,
                    ssSalesOrderId: created.sales_order_id,
                    ssExternalShipmentId: externalShipmentId,
                },
                labels: [],
            };
        }
        catch (e) {
            this.logger_.error(`[ShipStation] Failed to create fulfillment ${fulfillment.id}: ${e?.message ?? e}`);
            throw e;
        }
    }
    async cancelFulfillment(fulfillment) {
        const fulfillmentData = (fulfillment.data ?? {});
        const ssShipmentId = fulfillmentData.ssShipmentId;
        if (!ssShipmentId) {
            this.logger_.info(`[ShipStation] cancelFulfillment: no ssShipmentId on fulfillment ${fulfillment.id} — nothing to cancel.`);
            return {};
        }
        try {
            await this.client.cancelShipment(ssShipmentId);
            this.logger_.info(`[ShipStation] Cancelled shipment ${ssShipmentId} for fulfillment ${fulfillment.id}.`);
        }
        catch (e) {
            this.logger_.error(`[ShipStation] Failed to cancel shipment ${ssShipmentId} for fulfillment ${fulfillment.id}: ${e?.message ?? e}`);
        }
        return {};
    }
}
exports.ShipStationProviderService = ShipStationProviderService;
ShipStationProviderService.identifier = SHIPSTATION_PROVIDER_IDENTIFIER;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL3NoaXBzdGF0aW9uL3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBR2tDO0FBY2xDLGdFQUF1RTtBQXlFdkUsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFVLEVBQXNCLEVBQUU7SUFDbEQsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ25CLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtBQUN0RCxDQUFDLENBQUE7QUFFRCxNQUFNLCtCQUErQixHQUFHLHlCQUF5QixDQUFBO0FBRWpFLE1BQWEsMEJBQTJCLFNBQVEsMENBQWtDO0lBUzlFLFlBQVksSUFBMEIsRUFBRSxPQUFnQjtRQUNwRCxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUUxQixJQUFJLENBQUM7WUFDRCxJQUFJLENBQUMsTUFBTSxHQUFJLElBQWdDLENBQzNDLGlDQUF5QixDQUFDLEtBQUssQ0FDQyxDQUFBO1FBQ3hDLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDTCxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDYiw2REFBNkQsQ0FDaEUsQ0FBQTtRQUNMLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUE7UUFDdkMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUVqRCxJQUFJLENBQUMs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