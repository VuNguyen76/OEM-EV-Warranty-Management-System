import { warrantyApi } from "../../service/warrantyApi";

const extendedWarrantyApi = warrantyApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET ALL CLAIMS
    getAllClaims: builder.query({
      query: (params = {}) => {
        const { status, service_center_id, vin } = params;
        const queryParams = new URLSearchParams();
        if (status) queryParams.append("status", status);
        if (service_center_id) queryParams.append("service_center_id", service_center_id);
        if (vin) queryParams.append("vin", vin);
        
        return {
          url: `claims${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response) => response.data || response,
      providesTags: ["WarrantyClaim"],
    }),

    // GET CLAIM BY CODE
    getClaimByCode: builder.query({
      query: (code) => ({
        url: `claims/${code}`,
        method: "GET",
      }),
      transformResponse: (response) => response.claim || response.data,
      providesTags: (result, error, code) => [{ type: "WarrantyClaim", id: code }],
    }),

    // CREATE WARRANTY CLAIM
    createClaim: builder.mutation({
      query: (formData) => {
        // FormData sẽ được gửi trực tiếp
        // baseQueryWithFormData sẽ xử lý việc không set Content-Type
        return {
          url: "claims",
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response) => response,
      invalidatesTags: ["WarrantyClaim"],
    }),

    // UPDATE CLAIM STATUS
    updateClaimStatus: builder.mutation({
      query: ({ code, data }) => ({
        url: `claims/${code}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { code }) => [
        { type: "WarrantyClaim", id: code },
        "WarrantyClaim",
      ],
    }),

    // GET ALL REPAIR ORDERS
    getAllRepairOrders: builder.query({
      query: (params = {}) => {
        const { status } = params;
        const queryParams = new URLSearchParams();
        if (status) queryParams.append("status", status);
        
        return {
          url: `repair-orders${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response) => response.data || response,
      providesTags: ["RepairOrder"],
    }),

    // GET REPAIR ORDER BY ID
    getRepairOrderById: builder.query({
      query: (id) => ({
        url: `repair-orders/${id}`,
        method: "GET",
      }),
      transformResponse: (response) => response.data || response,
      providesTags: (result, error, id) => [{ type: "RepairOrder", id }],
    }),

    getClaimByTechnician: builder.query({
      query: (technician_id) => ({
        url: `claims/technician/${technician_id}`,
        method: "GET",
      }),
      transformResponse: (response) => response.data || response,
      providesTags: (result, error, technician_id) => [
        { type: "WarrantyClaim", id: technician_id },
      ],
    }),

    // CREATE REPAIR ORDER
    createRepairOrder: builder.mutation({
      query: (data) => ({
        url: "repair-orders",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["RepairOrder", "WarrantyClaim"],
    }),

    // UPDATE REPAIR ORDER
    updateRepairOrder: builder.mutation({
      query: ({ id, data }) => ({
        url: `repair-orders/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "RepairOrder", id },
        "RepairOrder",
        "WarrantyClaim",
      ],
    }),
    
    getTechnicianClaims: builder.query({
      query: (technician_id) => ({
        url: `claims/technician/${technician_id}`,
        method: "GET",
      }),
      transformResponse: (response) => response.data || response,
      providesTags: (result, error, technician_id) => [
        { type: "WarrantyClaim", id: technician_id },
      ],
    }),
    approveClaim: builder.mutation({
      query: (code) => ({
        url: `claims/${code}/approve`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, code) => [
        { type: "WarrantyClaim", id: code },
        "WarrantyClaim",
      ],
    }),

  }),
});

export const {
  useGetAllClaimsQuery,
  useGetClaimByCodeQuery,
  useCreateClaimMutation,
  useUpdateClaimStatusMutation,
  useGetAllRepairOrdersQuery,
  useGetRepairOrderByIdQuery,
  useCreateRepairOrderMutation,
  useUpdateRepairOrderMutation,
  useGetClaimByTechnicianQuery,
  useGetTechnicianClaimsQuery,
  useApproveClaimMutation,
} = extendedWarrantyApi;

