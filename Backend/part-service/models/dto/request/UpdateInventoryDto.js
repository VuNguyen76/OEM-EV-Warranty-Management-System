class UpdateInventoryDto {
  constructor(data) {
    this.quantity = data.quantity;
    this.threshold = data.threshold;
  }

  // Kiểm tra dữ liệu hợp lệ
  validate() {
    const errors = [];

    if (this.quantity != null && typeof this.quantity !== "number") {
      errors.push("Số lượng (quantity) phải là số.");
    }

    if (this.threshold != null && typeof this.threshold !== "number") {
      errors.push("Ngưỡng cảnh báo (threshold) phải là số.");
    }

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
    return model;
  }
}

export default UpdateInventoryDto;
