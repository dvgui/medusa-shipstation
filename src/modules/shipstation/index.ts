import { Module, ModuleProvider, Modules } from "@medusajs/framework/utils"
import { ShipStationProviderService } from "./service"

export const SHIP_STATION_MODULE = "ship_station"

export default Module(SHIP_STATION_MODULE, {
    service: ShipStationProviderService,
})

export const provider = ModuleProvider(Modules.FULFILLMENT, {
    services: [ShipStationProviderService],
})

// Workaround for a known Medusa plugin-loading quirk where the ModuleProvider
// export does not get picked up unless `services` is reflected onto the
// default export as well. Mirrors what royal-mail-plugin does.
// https://github.com/medusajs/medusa/issues/11205
module.exports.default = {
    ...module.exports.default,
    services: [ShipStationProviderService],
}
