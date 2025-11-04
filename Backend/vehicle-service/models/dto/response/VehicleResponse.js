export default class VehicleResponseDto {
  constructor(vehicle) {
    this._id = vehicle._id;

    // VIN info (đã populate)
    this.vin = vehicle.vin_id?.vin || null;
    this.manufacturer = vehicle.vin_id?.manufacturer || null;
    this.modelYear = vehicle.vin_id?.modelYear || null;

    // Customer info (đã populate)
    this.customer_name = vehicle.customer_id?.full_name || null;
    this.customer_phone = vehicle.customer_id?.phone || null;
    this.customer_email = vehicle.customer_id?.email || null;
    this.customer_address = vehicle.customer_id?.address || null;

    // Các trường khác
    this.center_id = vehicle.center_id;
    this.registration_number = vehicle.registration_number;
    this.model = vehicle.model;
    this.color = vehicle.color;
    this.warranty_start = vehicle.warranty_start;
    this.warranty_end = vehicle.warranty_end;
    this.parts = vehicle.parts || [];
    this.current_mileage = vehicle.current_mileage;
    this.kilometer = vehicle.kilometer;
    this.status = vehicle.status;
  }
}
