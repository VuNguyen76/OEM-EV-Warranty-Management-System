import React, { useState } from "react";
import Title from "../../../components/Title";
import Loading from "../../../components/Loading";
import { Link, useNavigate } from "react-router-dom";
import { useGetAllVehiclesQuery } from "../../../features/vehicle/vehicle.api";
import { useDispatch, useSelector } from "react-redux";
import { setSearchResult } from "../../../features/warranty/warranty.slice";

const SearchVIN = () => {
  const [vin, setVin] = useState("1HGCM82633A004352");
  const [status, setStatus] = useState("idle");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { data: vehicles, isLoading } = useGetAllVehiclesQuery();
  const { searchResult: result } = useSelector((state) => state.warranty);

  const handleSearch = () => {
    if (!vin.trim()) return;
    setStatus("loading");
    const found = vehicles.find(
      (v) => v.vin.toLowerCase() === vin.toLowerCase().trim()
    );
    if (found) {
      dispatch(setSearchResult(found));
      localStorage.setItem("result", JSON.stringify(found));
      setStatus("success");
    } else {
      dispatch(setSearchResult(null));
      setStatus("not_found");
    }
  };
  const warrantyStatus = (warranty_end) => {
    const now = new Date();
    const endDate = new Date(warranty_end);
    return endDate >= now ? "Còn hiệu lực" : "Hết hạn";
  };

  function handleConfirm() {
    navigate("/sc_staff/create-claim", { state: { vin: vin } });
  }

  return (
    <div className="h-full w-full space-y-3 p-4">
      <div className="border border-gray-300 p-4 rounded-lg">
        <Title
          title="Tra cứu VIN"
          subTitle="Tra cứu thông tin xe điện qua số VIN"
        />
        <div className="flex items-center gap-2 mt-2">
          <i className="fa-solid fa-magnifying-glass text-2xl text-gray-700"></i>
          <h3 className="text-2xl font-semibold">Tìm kiếm xe</h3>
        </div>

        <p className="text-gray-500 mt-2">
          Nhập số VIN để tra cứu thông tin xe và khách hàng
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Nhập số VIN"
            className="flex-grow border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
          />
          <button
            onClick={handleSearch}
            className={`bg-green-500 text-white px-4 py-2 space-x-2 rounded-lg hover:bg-green-600 ${
              isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
            disabled={isLoading}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>Tìm kiếm</span>
          </button>
        </div>
      </div>

      {/* Hiển thị theo trạng thái */}
      {status === "loading" && <Loading />}

      {status === "not_found" && (
        <div>
          <p className="text-center text-red-500 font-semibold">
            <span>Không tìm thấy kết quả phù hợp.</span>
          </p>
          <p className="text-center text-gray-500">
            Vui lòng Kiểm tra lại VIN hoặc
            <Link
              to={"/sc_staff/register-vin"}
              className="text-green-500 font-semibold"
            >
              {" "}
              Đăng ký xe mới
            </Link>
          </p>
        </div>
      )}

      {status === "success" && result && (
        <>
          {/* Khối thông tin */}
          <div className="flex gap-4">
            <div className="w-1/2 space-y-3 border border-gray-300 p-4 rounded-lg">
              <Title title="Thông tin xe" />
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">VIN</p>
                  <p className="font-semibold">{result.vin}</p>
                </div>
                <div>
                  <p className="text-gray-500">Biển số xe</p>
                  <p className="font-semibold">{result.registration_number}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">Hãng xe</p>
                  <p className="font-semibold">{result.manufacturer}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mẫu xe</p>
                  <p className="font-semibold">{result.model}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">Năm sản xuất</p>
                  <p className="font-semibold">{result.modelYear}</p>
                </div>
                <div>
                  <p className="text-gray-500">Màu sắc</p>
                  <p className="font-semibold">{result.color}</p>
                </div>
              </div>
              <p className="text-gray-500">
                <i className="fa-regular fa-clock"></i>
                <span> Số km đã đi: </span>
                <span className="text-xl text-black font-semibold">
                  {result.kilometer.toLocaleString()} km
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-shield-halved"></i>
                <span> Trạng thái bảo hành: </span>
                <span className="px-2 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                  {warrantyStatus(result.warranty_end)}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-table"></i>
                <span> Hết hạn bảo hành: </span>
                <span className="text-black font-semibold">
                  {new Date(result.warranty_end).toLocaleDateString("vi-VN")}
                </span>
              </p>
            </div>

            {/* Khối thông tin khách hàng */}
            <div className="w-1/2 space-y-3 border border-gray-300 p-4 rounded-lg">
              <Title title="Thông tin khách hàng" />
              <div>
                <p className="text-gray-500">Họ tên</p>
                <p className="text-xl font-semibold">{result.customer_name}</p>
              </div>
              <p className="text-gray-500">
                <i className="fa-solid fa-phone"></i>
                <span> Số điện thoại: </span>
                <span className=" text-black font-semibold">
                  {result.customer_phone}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-location-dot"></i>
                <span> Địa chỉ: </span>
                <span className=" text-black font-semibold">
                  {result.customer_address}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-envelope"></i>
                <span> Email: </span>
                <span className="text-black font-semibold">
                  {result.customer_email}
                </span>
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleConfirm}
              className="w-[200px] font-semibold bg-green-500 text-white px-4 py-2 space-x-2 rounded-lg hover:bg-green-600 cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchVIN;
