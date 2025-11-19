// src/features/part/part.api.js
import { api } from "../../service/api";

const withPartPrefix = (path = "") => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return normalized ? `part/${normalized}` : "part";
};

const extendedPartApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // 🔹 Lấy danh sách mẫu phụ tùng (PartCatalog)
    getAllPartCatalogs: builder.query({
      query: () => ({
        url: withPartPrefix("part-catalog"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["PartCatalog"],
    }),

    createPartCatalog: builder.mutation({
      query: (data) => ({
        url: withPartPrefix("part-catalog"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["PartCatalog"],
    }),

    // 🔹 Lấy danh sách phụ tùng thật (PartInstance)
    getAllParts: builder.query({
      query: () => ({
        url: withPartPrefix("parts"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Part"],
    }),

    // 🔹 Lấy phụ tùng theo xe
    getPartsByVehicle: builder.query({
      query: (vehicle_id) => ({
        url: withPartPrefix(`parts/vehicle/${vehicle_id}`),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Part"],
    }),

    // 🔹 Thêm phụ tùng (gắn vào xe)
    addPartToVehicle: builder.mutation({
      query: (data) => ({
        url: withPartPrefix("parts"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Part"],
    }),

    // 🔹 Cập nhật trạng thái phụ tùng
    updatePart: builder.mutation({
      query: ({ id, data }) => ({
        url: withPartPrefix(`parts/${id}`),
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Part"],
    }),

    // 🔹 Xóa phụ tùng
    deletePart: builder.mutation({
      query: (id) => ({
        url: withPartPrefix(`parts/${id}`),
        method: "DELETE",
      }),
      invalidatesTags: ["Part"],
    }),
    // 🔹 Lấy danh sách tồn kho
    getInventory: builder.query({
      query: () => ({
        url: withPartPrefix("inventory"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Inventory"],
    }),

    // 🔹 Cập nhật tồn kho
    updateInventory: builder.mutation({
      query: ({ part_catalog_id, data }) => ({
        url: withPartPrefix(`inventory/${part_catalog_id}`),
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Inventory"],
    }),
    // 🔹 Tạo tồn kho
    createInventory: builder.mutation({
      query: (data) => ({
        url: withPartPrefix("inventory"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Inventory"],
    }),
    deleteInventory: builder.mutation({
      query: (part_catalog_id) => ({
        url: withPartPrefix(`inventory/${part_catalog_id}`),
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory"],
    }),
  }),
});

export const {
  useGetAllPartCatalogsQuery,
  useGetAllPartsQuery,
  useGetPartsByVehicleQuery,
  useAddPartToVehicleMutation,
  useUpdatePartMutation,
  useDeletePartMutation,
  useGetInventoryQuery,
  useUpdateInventoryMutation,
  useCreateInventoryMutation,
  useCreatePartCatalogMutation,
  useDeleteInventoryMutation,
} = extendedPartApi;
