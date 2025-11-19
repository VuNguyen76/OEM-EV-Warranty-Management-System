import { campaignApi } from "../../service/campaignApi";

const extendedCampaignApi = campaignApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllCampaigns: builder.query({
      query: () => ({
        url: "campaigns",
        method: "GET",
      }),
      providesTags: ["Campaign"],
      transformResponse: (response) => response.data,
    }),
    getAllCampaignVehicles: builder.query({
      query: () => ({
        url: "campaign-vehicles",
        method: "GET",
      }),
      providesTags: ["Campaign"],
      transformResponse: (response) => response.data,
    }),
    getAllAppointments: builder.query({
      query: () => ({
        url: "appointments",
        method: "GET",
      }),
      providesTags: ["Campaign"],
      transformResponse: (response) => response.data,
    }),
    createAppointment: builder.mutation({
      query: (data) => ({
        url: "appointments",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Campaign"],
    }),
    createCampaign: builder.mutation({
      query: (data) => ({
        url: "campaigns",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Campaign"],
    }),
    updateCampaignVehicleStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `campaign-vehicles/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Campaign"],
    }),
  }),
});

export const {
  useGetAllCampaignsQuery,
  useGetAllCampaignVehiclesQuery,
  useGetAllAppointmentsQuery,
  useCreateAppointmentMutation,
  useCreateCampaignMutation,
  useUpdateCampaignVehicleStatusMutation,
} = extendedCampaignApi;
