import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Auth from "../page/auth/Auth";
import DefaultLayout from "../components/DefaultLayout";
import { SCHomePage } from "../page/Home";
import RegisterVIN from "../page/Home/SC/RegisterVIN";
import ForgotPassword from "../page/auth/ForgotPassword";

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
        element: <SCHomePage />,
      },
      {
        path: "register-vin",
        element: <RegisterVIN />,
      },
    ],
  },
]);

export default router;
