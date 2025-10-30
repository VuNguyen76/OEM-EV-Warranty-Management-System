import Part from '../models/Part.js';
import CreatePartDto from '../models/dto/request/CreatePartDto.js';
import UpdatePartDto from '../models/dto/request/UpdatePartDto.js';
import PartResponseDto from '../models/dto/response/PartResponse.js';

class PartController {
  // POST /api/parts - Tạo phụ tùng mới
  static async createPart(req, res) {
    try {
      const createDto = new CreatePartDto(req.body);
      const validation = createDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: validation.newErrors
        });
      }

      const part = new Part(createDto.toModel());
      await part.save();

      const responseDto = new PartResponseDto(part);
      res.status(201).json({
        success: true,
        message: 'Tạo phụ tùng thành công',
        data: responseDto
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Lỗi tạo phụ tùng',
        error: error.message
      });
    }
  }

  // GET /api/parts - Lấy danh sách phụ tùng
  static async getParts(req, res) {
    try {
      const { category, status, manufacturer } = req.query;

      const filter = {};
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (manufacturer) filter.manufacturer = { $regex: manufacturer, $options: 'i' };

      const parts = await Part.find(filter).sort({ created_at: -1 });
      const responseData = parts.map(part => new PartResponseDto(part));

      res.json({
        success: true,
        data: responseData,
        count: responseData.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi lấy danh sách phụ tùng',
        error: error.message
      });
    }
  }

  // GET /api/parts/:part_id - Lấy chi tiết phụ tùng
  static async getPartById(req, res) {
    try {
      const { part_id } = req.params;
      const part = await Part.findOne({ part_id });

      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phụ tùng'
        });
      }

      const responseDto = new PartResponseDto(part);
      res.json({
        success: true,
        data: responseDto
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi lấy thông tin phụ tùng',
        error: error.message
      });
    }
  }

  // PATCH /api/parts/:part_id - Cập nhật thông tin phụ tùng
  static async updatePart(req, res) {
    try {
      const { part_id } = req.params;
      const updateDto = new UpdatePartDto(req.body);
      const validation = updateDto.validate();

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: validation.newErrors
        });
      }

      const part = await Part.findOneAndUpdate(
        { part_id },
        updateDto.toModel(),
        { new: true, runValidators: true }
      );

      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phụ tùng'
        });
      }

      const responseDto = new PartResponseDto(part);
      res.json({
        success: true,
        message: 'Cập nhật phụ tùng thành công',
        data: responseDto
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Lỗi cập nhật phụ tùng',
        error: error.message
      });
    }
  }

  // DELETE /api/parts/:part_id - Xóa phụ tùng
  static async deletePart(req, res) {
    try {
      const { part_id } = req.params;
      const part = await Part.findOneAndDelete({ part_id });

      if (!part) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phụ tùng'
        });
      }

      res.json({
        success: true,
        message: 'Xóa phụ tùng thành công'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi xóa phụ tùng',
        error: error.message
      });
    }
  }

  // GET /api/parts/search?q=keyword - Tìm kiếm phụ tùng
  static async searchParts(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu từ khóa tìm kiếm'
        });
      }

      const parts = await Part.find({
        $or: [
          { part_id: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { manufacturer: { $regex: q, $options: 'i' } }
        ]
      }).sort({ created_at: -1 });

      const responseData = parts.map(part => new PartResponseDto(part));

      res.json({
        success: true,
        data: responseData,
        count: responseData.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi tìm kiếm phụ tùng',
        error: error.message
      });
    }
  }
}

export default PartController;