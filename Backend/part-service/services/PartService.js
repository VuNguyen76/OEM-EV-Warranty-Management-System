import Part from '../models/PartModel.js';
import Inventory from '../models/InventoryModel.js';
import Shipment from '../models/ShipmentModel.js';

class PartService {
  // Validate part data before creation
  async validatePartData(partData) {
    const { part_id, name, category, manufacturer } = partData;
    
    if (!part_id || !name || !category || !manufacturer) {
      throw new Error('Missing required fields: part_id, name, category, manufacturer');
    }

    // Check if part_id already exists
    const existingPart = await Part.findOne({ part_id });
    if (existingPart) {
      throw new Error(`Part with ID ${part_id} already exists`);
    }

    return true;
  }

  // Create new part
  async createPart(partData) {
    await this.validatePartData(partData);
    
    const part = new Part(partData);
    await part.save();
    
    return part;
  }

  // Get parts with filtering and pagination
  async getParts(filters = {}, pagination = {}) {
    const { category, status, manufacturer } = filters;
    const { page = 1, limit = 20 } = pagination;
    
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (manufacturer) filter.manufacturer = new RegExp(manufacturer, 'i');
    
    const parts = await Part.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });
    
    const total = await Part.countDocuments(filter);
    
    return {
      parts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    };
  }

  // Get part by ID
  async getPartById(partId) {
    const part = await Part.findOne({ part_id: partId });
    if (!part) {
      throw new Error('Part not found');
    }
    return part;
  }

  // Update part
  async updatePart(partId, updateData) {
    const part = await Part.findOneAndUpdate(
      { part_id: partId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!part) {
      throw new Error('Part not found');
    }
    
    return part;
  }

  // Check if part can be deleted
  async canDeletePart(partId) {
    // Check if part has active inventory
    const inventory = await Inventory.findOne({ part_id: partId, quantity: { $gt: 0 } });
    if (inventory) {
      throw new Error('Cannot delete part with active inventory');
    }

    // Check if part has pending shipments
    const shipment = await Shipment.findOne({ 
      'parts_list.part_id': partId,
      status: { $in: ['pending', 'in_transit'] }
    });
    if (shipment) {
      throw new Error('Cannot delete part with pending shipments');
    }

    return true;
  }

  // Delete part
  async deletePart(partId) {
    await this.canDeletePart(partId);
    
    const part = await Part.findOneAndDelete({ part_id: partId });
    if (!part) {
      throw new Error('Part not found');
    }
    
    return part;
  }

  // Get parts by category
  async getPartsByCategory(category) {
    return await Part.find({ category, status: 'active' });
  }

  // Search parts by name or description
  async searchParts(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return await Part.find({
      $or: [
        { name: regex },
        { description: regex },
        { manufacturer: regex }
      ],
      status: 'active'
    });
  }
}

export default new PartService();