"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = exports.SHIP_STATION_MODULE = void 0;
const utils_1 = require("@medusajs/framework/utils");
const service_1 = require("./service");
exports.SHIP_STATION_MODULE = "ship_station";
exports.default = (0, utils_1.Module)(exports.SHIP_STATION_MODULE, {
    service: service_1.ShipStationProviderService,
});
exports.provider = (0, utils_1.ModuleProvider)(utils_1.Modules.FULFILLMENT, {
    services: [service_1.ShipStationProviderService],
});
// Workaround for a known Medusa plugin-loading quirk where the ModuleProvider
// export does not get picked up unless `services` is reflected onto the
// default export as well. Mirrors what royal-mail-plugin does.
// https://github.com/medusajs/medusa/issues/11205
module.exports.default = {
    ...module.exports.default,
    services: [service_1.ShipStationProviderService],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9zaGlwc3RhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBMkU7QUFDM0UsdUNBQXNEO0FBRXpDLFFBQUEsbUJBQW1CLEdBQUcsY0FBYyxDQUFBO0FBRWpELGtCQUFlLElBQUEsY0FBTSxFQUFDLDJCQUFtQixFQUFFO0lBQ3ZDLE9BQU8sRUFBRSxvQ0FBMEI7Q0FDdEMsQ0FBQyxDQUFBO0FBRVcsUUFBQSxRQUFRLEdBQUcsSUFBQSxzQkFBYyxFQUFDLGVBQU8sQ0FBQyxXQUFXLEVBQUU7SUFDeEQsUUFBUSxFQUFFLENBQUMsb0NBQTBCLENBQUM7Q0FDekMsQ0FBQyxDQUFBO0FBRUYsOEVBQThFO0FBQzlFLHdFQUF3RTtBQUN4RSwrREFBK0Q7QUFDL0Qsa0RBQWtEO0FBQ2xELE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHO0lBQ3JCLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPO0lBQ3pCLFFBQVEsRUFBRSxDQUFDLG9DQUEwQixDQUFDO0NBQ3pDLENBQUEifQ==