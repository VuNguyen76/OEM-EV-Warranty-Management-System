import React, { useState } from "react";
import Title from "../../../components/Title";
import Loading from "../../../components/Loading";

const vehicles = [
  {
    vin: "5YJ3E1EA4KF123456",
    brand: "VinFast",
    model: "VF8",
    year: 2023,
    color: "Pearl White",
    kilometers: 15000,
    warrantyStatus: "Còn hiệu lực",
    warrantyExpiry: "2026-03-15",
    customer: {
      name: "Nguyễn Văn An",
      phone: "0987654321",
      email: "nguyenvanan@email.com",
    },
  },
];

const SearchVIN = () => {
  const [vin, setVin] = useState("5YJ3E1EA4KF123456");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");

  const handleSearch = () => {
    if (!vin.trim()) return;
    setStatus("loading");
    setTimeout(() => {
      const found = vehicles.find(
        (v) => v.vin.toLowerCase() === vin.toLowerCase().trim()
      );
      if (found) {
        setResult(found);
        setStatus("success");
      } else {
        setResult(null);
        setStatus("not_found");
      }
    }, 500);
  };

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
            className="bg-green-500 text-white px-4 py-2 space-x-2 rounded-lg hover:bg-green-600 cursor-pointer"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>Tìm kiếm</span>
          </button>
        </div>
      </div>

      {/* Hiển thị theo trạng thái */}
      {status === "loading" && <Loading />}

      {status === "not_found" && (
        <p className="text-center text-red-500 font-semibold">
          Không tìm thấy kết quả phù hợp.
        </p>
      )}

      {status === "success" && result && (
        <>
          {/* Khối thông tin */}
          <div className="flex gap-4">
            <div className="w-1/2 space-y-3 border border-gray-300 p-4 rounded-lg">
              <Title title="Thông tin xe" />
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">Hãng xe</p>
                  <p className="font-semibold">{result.brand}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mẫu xe</p>
                  <p className="font-semibold">{result.model}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">Năm sản xuất</p>
                  <p className="font-semibold">{result.year}</p>
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
                  {result.kilometers.toLocaleString()} km
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-shield-halved"></i>
                <span> Trạng thái bảo hành: </span>
                <span className="px-2 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                  {result.warrantyStatus}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-table"></i>
                <span> Hết hạn bảo hành: </span>
                <span className="text-black font-semibold">
                  {result.warrantyExpiry}
                </span>
              </p>
            </div>

            {/* Khối thông tin khách hàng */}
            <div className="w-1/2 space-y-3 border border-gray-300 p-4 rounded-lg">
              <Title title="Thông tin khách hàng" />
              <div>
                <p className="text-gray-500">Họ tên</p>
                <p className="font-semibold">{result.customer.name}</p>
              </div>
              <p className="text-gray-500">
                <i className="fa-solid fa-phone"></i>
                <span> Số điện thoại: </span>
                <span className="text-xl text-black font-semibold">
                  {result.customer.phone}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-envelope"></i>
                <span> Email: </span>
                <span className="text-black font-semibold">
                  {result.customer.email}
                </span>
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button className="w-[200px] font-semibold bg-green-500 text-white px-4 py-2 space-x-2 rounded-lg hover:bg-green-600 cursor-pointer">
              Xác nhận
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchVIN;
