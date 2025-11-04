class PartResponseDto {
  constructor(data) {
    this.id = data._id;
    this.serial_number = data.serial_number;
    this.vehicle_id = data.vehicle_id ?? null;
    this.install_date = data.install_date || null;
    this.warranty_end = data.warranty_end || null;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;

    const pc = data.part_catalog_id;
    if (pc && typeof pc === "object" && pc._id) {
      this.part_catalog = {
        id: pc._id,
        name: pc.name,
        category: pc.category,
        manufacturer: pc.manufacturer,
        model_code: pc.model_code,
        cost_price: pc.cost_price,
        weight_kg: pc.weight_kg,
      };
    } else {
      this.part_catalog = pc ? { id: pc.toString ? pc.toString() : pc } : null;
    }
  }

  toJSON() {
    return {
      _id: this.id,
      serial_number: this.serial_number,
      vehicle_id: this.vehicle_id,
      install_date: this.install_date,
      warranty_end: this.warranty_end,
      status: this.status,
      part_name: this.part_catalog.name,
      part_category: this.part_catalog.category,
      part_manufacturer: this.part_catalog.manufacturer,
      part_model_code: this.part_catalog.model_code,
      part_cost_price: this.part_catalog.cost_price,
      part_weight_kg: this.part_catalog.weight_kg,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default PartResponseDto;
