import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Auth from "../page/auth/Auth";
import DefaultLayout from "../layout/DefaultLayout";
import Dashboard from "../page/Home/SC/Dashboard";
import RegisterVIN from "../page/Home/SC/RegisterVIN";
import SearchVIN from "../page/Home/SC/SearchVIN";
import CreateClaim from "../page/Home/SC/CreateClaim";
import ManageClaim from "../page/Home/SC/ManageClaim";
import ManageCustomer from "../page/Home/SC/ManageCustomer";
import ManageCampaign from "../page/Home/SC/ManageCampaign";
import ProtectRoute from "../components/ProtectRoute";
import Unauthorized from "../components/Unauthorized";
import CenterManagement from "../page/Home/EVM/CenterManagement";
import ManageTechnician from "../page/Home/SC/ManageTechnician";
import AuthActive from "../page/auth/AuthActive";
import Technician from "../page/Home/SC/Technician";
import ClaimsManagement from "../page/Home/EVM/ClaimsManagement";
import CustomerConfirmPage from "../page/CustomerConfirmPage";
import PartsManagement from "../page/Home/EVM/Part/PartsManagement";
import CampaignManagement from "../page/Home/EVM/CampaignManagement";
import Analytics from "../page/Home/EVM/Analytics";
import WarrantyPolicyManagement from "../page/Home/EVM/WarrantyPolicyManagement.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Auth />,
  },
  {
    path: "/claim-confirm/:code",
    element: <CustomerConfirmPage />,
  },
  {
    path: "/auth-active",
    element: <AuthActive />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  {
    element: <ProtectRoute allowedRoles={["sc_staff", "admin"]} />,
    children: [
      {
        path: "/sc_staff",
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
          {
            path: "manage-technician",
            element: <ManageTechnician />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectRoute allowedRoles={["admin", "evm_staff"]} />,
    children: [
      {
        path: "/evm",
        element: <DefaultLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: "manage-center",
            element: <CenterManagement />,
          },
          {
            path: "manage-claim",
            element: <ClaimsManagement />,
          },
          {
            path: "manage-parts",
            element: <PartsManagement />,
          },
          {
            path: "manage-campaign",
            element: <CampaignManagement />,
          },
          {
            path: "analytics",
            element: <Analytics />,
          },
          {
            path: "manage-warranty-policy",
            element: <WarrantyPolicyManagement />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectRoute allowedRoles={["sc_technician"]} />,
    children: [
      {
        path: "/sc_technician",
        element: <DefaultLayout />,
        children: [
          {
            index: true,
            path: "technician",
            element: <Technician />,
          },
        ],
      },
    ],
  },
]);

export default router;
