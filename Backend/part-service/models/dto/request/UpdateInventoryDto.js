class UpdateInventoryDto {
  constructor(data) {
    this.quantity = data.quantity;
    this.threshold = data.threshold;
  }

  // Kiểm tra dữ liệu hợp lệ
  validate() {
    const errors = [];

    return {
      isValid: errors.length === 0,
      newErrors: errors,
    };
  }

  // Chuyển DTO thành dữ liệu model MongoDB có thể lưu
  toModel() {
    const model = {};
    if (this.quantity != null) model.quantity = this.quantity;
    if (this.threshold != null) model.threshold = this.threshold;
    model.last_updated = new Date(); // Cập nhật thời gian cuối cùng cập nhật tồn kho
    return model;
  }
}

export default UpdateInventoryDto;
