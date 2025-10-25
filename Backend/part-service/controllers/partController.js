import Part from '../models/Part.js';

class PartController {
  // Tạo phụ tùng mới
  async createPart(req, res) {
    try {
      const part = new Part(req.body);
      await part.save();

      res.status(201).json({
        success: true,
        message: 'Tạo phụ tùng thành công',
        part: part
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Tạo phụ tùng thất bại',
        error: error.message
      });
    }
  }

  // Lấy danh sách phụ tùng
  async getParts(req, res) {
    try {
      const { category, status } = req.query;

      const filter = {};
      if (category) filter.category = category;
      if (status) filter.status = status;

      const parts = await Part.find(filter).sort({ created_at: -1 });

      res.json(parts);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Lấy chi tiết 1 phụ tùng
  async getPartById(req, res) {
    try {
      const part = await Part.findOne(
        {
          part_id:
            req.params.part_id
        });

      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Part not found'
        });
      }

      res.json({
        success: true,
        part: part
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cập nhật thông tin phụ tùng
  async updatePart(req, res) {
    try {
      const { status, description, unit_price } = req.body;

      const part_id = req.params.part_id;
      const cost_price = parseInt(unit_price);

      const partExit = await Part.findOne({
        part_id: part_id
      });

      if (!partExit) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phụ tùng'
        });
      }

      await Part.updateOne({
        part_id: part_id
      },
        {
          status: status,
          description: description,
          cost_price: cost_price
        }
      );

      res.json({
        success: true,
        message: "Cập nhật phụ tùng thành công"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Xóa phụ tùng (admin only)
  async deletePart(req, res) {
    const part_id = req.params.part_id;
    try {
      const partExit = await Part.findOne({
        part_id: part_id
      });

      if (!partExit) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phụ tùng cần xóa'
        });
      }


      await Part.deleteOne({ part_id });

      res.json({
        success: true,
        message: 'Xóa phụ tùng thành công'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}


export default new PartController();