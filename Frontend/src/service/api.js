import { createApi } from "@reduxjs/toolkit/query/react";
import { apiGatewayBaseQuery } from "./apiGatewayBase";

export const api = createApi({
  reducerPath: "api",
  baseQuery: apiGatewayBaseQuery,
  tagTypes: [
    "Auth",
    "User",
    "Center",
    "Technician",
    "Vehicle",
    "WarrantyClaim",
    "RepairOrder",
    "WarrantyPolicy",
    "Campaign",
    "Analytics",
    "Part",
    "PartCatalog",
    "Inventory",
  ],
  endpoints: () => ({}),
});


