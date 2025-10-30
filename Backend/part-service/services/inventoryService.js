import Inventory from "../models/Inventory.js";

const inventoryService = {
  // Cập nhật số lượng tồn kho đơn hàng giao thành công
  updateInventoryOnDelivery: async (shipment) => {
    try {
      const parts = shipment.parts_list;
      for (const item of parts) {
        let inventory = await Inventory.findOne({ part_id: item.part_id });
        let stock = inventory.quantity - item.quantity;
        if (inventory) {
          await Inventory.updateOne(
            { part_id: item.part_id },
            {
              quantity: stock,
            }
          );
        }
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
      });
    }
  },
};

export default inventoryService;
