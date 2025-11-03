export default class VehicleResponseDto {
  constructor(vehicle) {
    this.id = vehicle._id;

    // VIN info (đã populate)
    this.vin = vehicle.vin_id?.vin || null;
    this.manufacturer = vehicle.vin_id?.manufacturer || null;
    this.modelYear = vehicle.vin_id?.modelYear || null;

    // Customer info (đã populate)
    this.customer_name = vehicle.customer_id?.full_name || null;
    this.customer_phone = vehicle.customer_id?.phone || null;
    this.customer_email = vehicle.customer_id?.email || null;

    // Các trường khác
    this.center_id = vehicle.center_id;
    this.registration_number = vehicle.registration_number;
    this.brand = vehicle.brand;
    this.model = vehicle.model;
    this.color = vehicle.color;
    this.manufacture_year = vehicle.manufacture_year;
    this.warranty_start = vehicle.warranty_start;
    this.warranty_end = vehicle.warranty_end;
    this.status = vehicle.status;
  }
}
