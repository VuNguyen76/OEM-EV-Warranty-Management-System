// src/features/part/part.api.js
import { partApi } from "../../service/partApi";

const extendedPartApi = partApi.injectEndpoints({
  endpoints: (builder) => ({
    // 🔹 Lấy danh sách mẫu phụ tùng (PartCatalog)
    getAllPartCatalogs: builder.query({
      query: () => ({
        url: "part-catalog",
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["PartCatalog"],
    }),

    // 🔹 Lấy danh sách phụ tùng thật (PartInstance)
    getAllParts: builder.query({
      query: () => ({
        url: "parts",
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Part"],
    }),

    // 🔹 Lấy phụ tùng theo xe
    getPartsByVehicle: builder.query({
      query: (vehicle_id) => ({
        url: `parts/vehicle/${vehicle_id}`,
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Part"],
    }),

    // 🔹 Thêm phụ tùng (gắn vào xe)
    addPartToVehicle: builder.mutation({
      query: (data) => ({
        url: "parts",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Part"],
    }),

    // 🔹 Cập nhật trạng thái phụ tùng
    updatePart: builder.mutation({
      query: ({ id, data }) => ({
        url: `parts/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Part"],
    }),

    // 🔹 Xóa phụ tùng
    deletePart: builder.mutation({
      query: (id) => ({
        url: `parts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Part"],
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
} = extendedPartApi;
