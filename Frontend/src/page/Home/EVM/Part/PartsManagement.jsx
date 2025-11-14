import React, { useState } from "react";
import {
  useGetAllPartCatalogsQuery,
  useGetInventoryQuery,
  useUpdateInventoryMutation,
  useCreateInventoryMutation,
  useCreatePartCatalogMutation,
} from "../../../../features/part/part.api";
import CreateInventoryModal from "./CreateInventoryModal";
import EditInventoryModal from "./EditInventoryModal";
import CreatePartCatalogModal from "./CreatePartCatalogModal";
import Loading from "../../../../components/Loading";

const PartsManagement = () => {
  const { data: inventories, isLoading, refetch } = useGetInventoryQuery();
  const { data: partCatalogs } = useGetAllPartCatalogsQuery();
  const [updateInventory] = useUpdateInventoryMutation();
  const [createInventory] = useCreateInventoryMutation();
  const [createPartCatalog] = useCreatePartCatalogMutation();

  // State modal
  const [showCreateInventory, setShowCreateInventory] = useState(false);
  const [showEditInventory, setShowEditInventory] = useState(false);
  const [showCreateCatalog, setShowCreateCatalog] = useState(false);

  const [selectedInventory, setSelectedInventory] = useState(null);

  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quản lý phụ tùng</h2>
        <div className="space-x-3">
          <button
            className="bg-green-600 font-semibold text-white px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
            onClick={() => setShowCreateInventory(true)}
          >
            Tạo tồn kho
          </button>
          <button
            className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
            onClick={() => setShowCreateCatalog(true)}
          >
            Tạo mẫu phụ tùng
          </button>
        </div>
      </div>

      {/* Danh sách tồn kho */}
      {isLoading ? (
        <Loading />
      ) : (
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-3 py-2">ID</th>
              <th className="border border-gray-300 px-3 py-2">Phụ tùng</th>
              <th className="border border-gray-300 px-3 py-2">Loại</th>
              <th className="border border-gray-300 px-3 py-2">Số lượng</th>
              <th className="border border-gray-300 px-3 py-2">
                Ngưỡng cảnh báo
              </th>
              <th className="border border-gray-300 px-3 py-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {inventories?.map((item, idx) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {idx + 1}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  {item.part_name}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  {item.category}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {item.quantity}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {item.threshold}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      setSelectedInventory(item);
                      setShowEditInventory(true);
                    }}
                  >
                    Chỉnh sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal tạo tồn kho */}
      {showCreateInventory && (
        <CreateInventoryModal
          onClose={() => setShowCreateInventory(false)}
          onSubmit={createInventory}
          partCatalogs={partCatalogs || []}
          refetch={refetch}
        />
      )}

      {/* Modal chỉnh sửa tồn kho */}
      {showEditInventory && selectedInventory && (
        <EditInventoryModal
          onClose={() => setShowEditInventory(false)}
          inventory={selectedInventory}
          onSubmit={updateInventory}
          refetch={refetch}
        />
      )}

      {/* Modal tạo Part Catalog */}
      {showCreateCatalog && (
        <CreatePartCatalogModal
          onClose={() => setShowCreateCatalog(false)}
          onSubmit={createPartCatalog}
          refetch={refetch}
        />
      )}
    </div>
  );
};

export default PartsManagement;
