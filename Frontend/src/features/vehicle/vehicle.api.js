import { vehicleApi } from "../../service/vehicleApi";

const extendedVehicleApi = vehicleApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET ALL VEHICLES
    getAllVehicles: builder.query({
      query: () => ({
        url: "vehicles",
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Vehicle"],
    }),

    // GET VEHICLE BY ID
    getVehicleById: builder.query({
      query: (id) => ({
        url: `vehicles/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Vehicle", id }],
    }),

    // CREATE VEHICLE (staff đăng ký xe từ VIN)
    createVehicle: builder.mutation({
      query: (data) => ({
        url: "vehicles",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Vehicle"],
    }),

    // UPDATE VEHICLE
    updateVehicle: builder.mutation({
      query: ({ id, data }) => ({
        url: `vehicles/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Vehicle", id }],
    }),

    // DELETE VEHICLE
    deleteVehicle: builder.mutation({
      query: (id) => ({
        url: `vehicles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Vehicle"],
    }),
  }),
});

export const {
  useGetAllVehiclesQuery,
  useGetVehicleByIdQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
} = extendedVehicleApi;
