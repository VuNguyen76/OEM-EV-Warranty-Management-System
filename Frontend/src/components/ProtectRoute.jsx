import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "react-toastify";

const ProtectRoute = ({ allowedRoles }) => {
  const { user, token } = useSelector((state) => state.user);
  if (!user || !token) {
    return <Navigate to="/" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectRoute;
