const partValidates = {
  createPart: (req, res, next) => {
    if (!req.body.part_id) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã phụ tùng (part_id)"
      });
    }

    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên phụ tùng"
      });
    }

    if (!req.body.category) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập loại phụ tùng"
      });
    }

    if (!req.body.manufacturer) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên nhà sản xuất"
      });
    }

    
    next();
  }
};


export default partValidates;
