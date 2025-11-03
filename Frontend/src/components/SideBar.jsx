import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
const sideBarSC = [
  {
    label: "Dashboard",
    icon: "fa-solid fa-car-side",
    path: "/sc_staff",
  },
  {
    label: "Đăng ký xe",
    icon: "fa-solid fa-pen-to-square",
    path: "/sc_staff/register-vin",
  },
  {
    label: "Tạo Claim",
    icon: "fa-solid fa-magnifying-glass",
    path: "/sc_staff/search-vin",
  },

  {
    label: "Quản lý Claim",
    icon: "fa-regular fa-clipboard",
    path: "/sc_staff/manage-claim",
  },
  {
    label: "Quản lý Khách hàng",
    icon: "fa-regular fa-id-badge",
    path: "/sc_staff/manage-customer",
  },
  {
    label: "Quản lý chiến dịch",
    icon: "fa-solid fa-triangle-exclamation",
    path: "/sc_staff/manage-campaign",
  },
];

const sideBarEVM = [
  {
    label: "Quản lý trung tâm dịch vụ",
    icon: "fa-solid fa-building-flag",
    path: "/evm/manage-center",
  },
];

const SideBar = () => {
  const { user } = useSelector((state) => state.user);

  return (
    <div className="h-full flex flex-col gap-4 border-r border-gray-300 py-2 pr-4">
      {(user.role === "sc_staff" ? sideBarSC : sideBarEVM).map(
        (item, index) => (
          <NavLink
            to={item.path}
            key={item.path}
            end={item.path === "/sc_staff"}
            className={({ isActive }) =>
              isActive
                ? "flex gap-2 items-center px-4 py-2 bg-green-500/20 text-green-500 rounded-lg"
                : "flex gap-2 items-center px-4 py-2 hover:bg-gray-200 rounded-lg"
            }
          >
            <i className={item.icon}></i>
            <p className="text-nowrap">{item.label}</p>
          </NavLink>
        )
      )}
    </div>
  );
};

export default SideBar;
