import { api } from "../../service/api";

const withCampaignPrefix = (path = "") => {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return normalized ? `campaign/${normalized}` : "campaign";
};

const extendedCampaignApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAllCampaigns: builder.query({
      query: () => ({
        url: withCampaignPrefix("campaigns"),
        method: "GET",
      }),
      providesTags: ["Campaign"],
      transformResponse: (response) => response.data,
    }),
    getAllCampaignVehicles: builder.query({
      query: () => ({
        url: withCampaignPrefix("campaign-vehicles"),
        method: "GET",
      }),
      providesTags: ["Campaign"],
      transformResponse: (response) => response.data,
    }),
    getAllAppointments: builder.query({
      query: () => ({
        url: withCampaignPrefix("appointments"),
        method: "GET",
      }),
      providesTags: ["Campaign"],
      transformResponse: (response) => response.data,
    }),
    createAppointment: builder.mutation({
      query: (data) => ({
        url: withCampaignPrefix("appointments"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Campaign"],
    }),
    createCampaign: builder.mutation({
      query: (data) => ({
        url: withCampaignPrefix("campaigns"),
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Campaign"],
    }),
    updateCampaignVehicleStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: withCampaignPrefix(`campaign-vehicles/${id}`),
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
