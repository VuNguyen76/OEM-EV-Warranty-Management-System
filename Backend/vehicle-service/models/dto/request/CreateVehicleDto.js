export default class CreateVehicleDto {
  constructor(data) {
    this.vin_id = data.vin_id;
    this.customer_id = data.customer_id || null;
    this.center_id = data.center_id || null;
    this.registration_number = data.registration_number;
    this.brand = data.brand;
    this.model = data.model;
    this.color = data.color;
    this.manufacture_year = data.manufacture_year;
    this.warranty_start = data.warranty_start;
    this.warranty_end = data.warranty_end;
  }

  validate() {
    const errors = {};
    if (!this.vin_id) errors.vin_id = "Thiếu VIN ID";
    if (!this.brand) errors.brand = "Thiếu tên thương hiệu";
    if (!this.model) errors.model = "Thiếu model xe";

    return {
      isValid: Object.keys(errors).length === 0,
      newErrors: errors,
    };
  }

  toModel() {
    return {
      vin_id: this.vin_id,
      customer_id: this.customer_id,
      center_id: this.center_id,
      registration_number: this.registration_number,
      brand: this.brand,
      model: this.model,
      color: this.color,
      manufacture_year: this.manufacture_year,
      warranty_start: this.warranty_start,
      warranty_end: this.warranty_end,
    };
  }
}
