import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const sideBarSC = [
  {
    label: "Dashboard",
    icon: "fa-solid fa-car-side",
    path: "/sc",
  },
  {
    label: "Đăng ký VIN",
    icon: "fa-solid fa-pen-to-square",
    path: "/sc/register-vin",
  },
  {
    label: "Tra cứu VIN",
    icon: "fa-solid fa-magnifying-glass",
    path: "/sc/search-vin",
  },
  {
    label: "Tạo Claim",
    icon: "fa-regular fa-file-lines",
    path: "/sc/create-claim",
  },
  {
    label: "Quản lý Claim",
    icon: "fa-regular fa-clipboard",
    path: "/sc/manage-claim",
  },
  {
    label: "Quản lý Khách hàng",
    icon: "fa-regular fa-id-badge",
    path: "/sc/manage-customer",
  },
  {
    label: "Quản lý chiến dịch",
    icon: "fa-solid fa-triangle-exclamation",
    path: "/sc/manage-campaign",
  },
];

const sideBarEVM = [
  {
    label: "Manufacturing Dashboard",
    icon: "fa-solid fa-industry",
    path: "/evm",
  },
  {
    label: "Quản lý mẫu xe",
    icon: "fa-solid fa-car",
    path: "/evm/models",
  },
  {
    label: "Sản xuất xe",
    icon: "fa-solid fa-conveyor-belt",
    path: "/evm/production",
  },
  {
    label: "Kiểm tra chất lượng",
    icon: "fa-solid fa-check-circle",
    path: "/evm/quality",
  },
  {
    label: "Báo cáo sản xuất",
    icon: "fa-solid fa-chart-line",
    path: "/evm/reports",
  },
];

const SideBar = () => {
  const location = useLocation();
  
  // Determine if we're in SC or EVM section based on the current path
  const isEVMSection = location.pathname.startsWith('/evm');
  const menuItems = isEVMSection ? sideBarEVM : sideBarSC;

  return (
    <div className="h-full flex flex-col gap-4 border-r border-gray-300 py-2 pr-4">
      <div className="px-4 py-2">
        <h2 className="text-lg font-bold text-gray-700">
          {isEVMSection ? "EVM - Nhà sản xuất" : "SC - Trung tâm bảo hành"}
        </h2>
      </div>
      
      {menuItems.map((item, index) => (
        <NavLink
          to={item.path}
          key={item.path}
          end={item.path === (isEVMSection ? "/evm" : "/sc")}
          className={({ isActive }) =>
            isActive
              ? "flex gap-2 items-center px-4 py-2 bg-green-500/20 text-green-500 rounded-lg"
              : "flex gap-2 items-center px-4 py-2 hover:bg-gray-200 rounded-lg"
          }
        >
          <i className={item.icon}></i>
          <p className="text-nowrap">{item.label}</p>
        </NavLink>
      ))}
      
      {/* Navigation between sections */}
      <div className="mt-auto pt-4 border-t border-gray-300">
        {isEVMSection ? (
          <Link to="/sc" className="flex gap-2 items-center px-4 py-2 hover:bg-gray-200 rounded-lg text-gray-600">
            <i className="fa-solid fa-arrow-right-to-bracket"></i>
            <p>Chuyển sang SC</p>
          </Link>
        ) : (
          <Link to="/evm" className="flex gap-2 items-center px-4 py-2 hover:bg-gray-200 rounded-lg text-gray-600">
            <i className="fa-solid fa-arrow-right-to-bracket"></i>
            <p>Chuyển sang EVM</p>
          </Link>
        )}
      </div>
    </div>
  );
};

export default SideBar;