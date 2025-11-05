export default class CreateVehicleDto {
  constructor(data) {
    this.vin_id = data.vin_id;
    this.customer_id = data.customer_id || null;
    this.center_id = data.center_id || null;
    this.registration_number = data.registration_number;
    this.model = data.model;
    this.color = data.color;
    this.kilometer = data.kilometer;

    // Convert dates to Date objects if they exist
    // Handle MongoDB Extended JSON format or string dates
    if (data.warranty_start) {
      if (
        typeof data.warranty_start === "object" &&
        data.warranty_start.$date
      ) {
        this.warranty_start = new Date(data.warranty_start.$date);
      } else {
        this.warranty_start =
          data.warranty_start instanceof Date
            ? data.warranty_start
            : new Date(data.warranty_start);
      }
    }

    if (data.warranty_end) {
      if (typeof data.warranty_end === "object" && data.warranty_end.$date) {
        this.warranty_end = new Date(data.warranty_end.$date);
      } else {
        this.warranty_end =
          data.warranty_end instanceof Date
            ? data.warranty_end
            : new Date(data.warranty_end);
      }
    }
  }

  validate() {
    const errors = {};
    if (!this.vin_id) errors.vin_id = "Thiếu VIN ID";
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
      model: this.model,
      color: this.color,
      kilometer: this.kilometer,
      warranty_start: this.warranty_start,
      warranty_end: this.warranty_end,
    };
  }
}
