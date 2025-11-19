import { api } from "../../service/api";

const withVehiclePrefix = (path = "") => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return normalized ? `vehicle/${normalized}` : "vehicle";
};

const extendedVehicleApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // GET ALL VEHICLES
    getAllVehicles: builder.query({
      query: () => ({
        url: withVehiclePrefix("vehicles"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Vehicle"],
    }),

    // GET VEHICLE BY ID
    getVehicleById: builder.query({
      query: (id) => ({
        url: withVehiclePrefix(`vehicles/${id}`),
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Vehicle", id }],
    }),

    // CREATE VEHICLE (staff đăng ký xe từ VIN)
    createVehicle: builder.mutation({
      query: (data) => ({
        url: withVehiclePrefix("vehicles"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Vehicle"],
    }),

    // UPDATE VEHICLE
    updateVehicle: builder.mutation({
      query: ({ id, data }) => ({
        url: withVehiclePrefix(`vehicles/${id}`),
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Vehicle", id }],
    }),

    // DELETE VEHICLE
    deleteVehicle: builder.mutation({
      query: (id) => ({
        url: withVehiclePrefix(`vehicles/${id}`),
        method: "DELETE",
      }),
      invalidatesTags: ["Vehicle"],
    }),

    // GET ALL VINS
    getAllVins: builder.query({
      query: () => ({
        url: withVehiclePrefix("vins"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Vehicle"],
    }),

    // GET ALL CUSTOMERS
    getAllCustomers: builder.query({
      query: () => ({
        url: withVehiclePrefix("customers"),
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Vehicle"],
    }),

    createCustomer: builder.mutation({
      query: (data) => ({
        url: withVehiclePrefix("customers"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Vehicle"],
    }),

    updateCustomer: builder.mutation({
      query: ({ id, data }) => ({
        url: withVehiclePrefix(`customers/${id}`),
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Vehicle"],
    }),

    deleteCustomer: builder.mutation({
      query: (id) => ({
        url: withVehiclePrefix(`customers/${id}`),
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
  useGetAllVinsQuery,
  useGetAllCustomersQuery,
  useUpdateCustomerMutation,
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
} = extendedVehicleApi;
