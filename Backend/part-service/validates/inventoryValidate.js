const inventoryValidates = {
  inventoryChange: (req, res, next) => {
    if (!req.body.part_id) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy mã phụ tùng"
      });
    }

    if (!req.body.quantity) {
      return res.status(400).json({
        success: false,
        message: "Số lượng không hợp lệ"
      });
    }

    next();
  }
};


export default inventoryValidates;
