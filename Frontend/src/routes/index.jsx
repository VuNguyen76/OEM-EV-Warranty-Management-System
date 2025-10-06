import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Auth from "../page/auth/Auth";
import DefaultLayout from "../layout/DefaultLayout";
import Dashboard from "../page/Home/SC/Dashboard";
import RegisterVIN from "../page/Home/SC/RegisterVIN";
import ForgotPassword from "../page/auth/ForgotPassword";
import SearchVIN from "../page/Home/SC/SearchVIN";
import CreateClaim from "../page/Home/SC/CreateClaim";
import ManageClaim from "../page/Home/SC/ManageClaim";
import ManageCustomer from "../page/Home/SC/ManageCustomer";
import ManageCampaign from "../page/Home/SC/ManageCampaign";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Auth />,
    children: [
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
    ],
  },
  {
    path: "/sc",
    element: <DefaultLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "register-vin",
        element: <RegisterVIN />,
      },
      {
        path: "search-vin",
        element: <SearchVIN />,
      },
      {
        path: "create-claim",
        element: <CreateClaim />,
      },
      {
        path: "manage-claim",
        element: <ManageClaim />,
      },
      {
        path: "manage-customer",
        element: <ManageCustomer />,
      },
      {
        path: "manage-campaign",
        element: <ManageCampaign />,
      },
    ],
  },
]);

export default router;
