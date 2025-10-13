

class BulkOperationService {
    /**
     * Bulk update multiple documents
     * @param {Object} Model - Mongoose model
     * @param {Array} updates - Array of update operations
     * @param {Object} options - Bulk operation options
     * @returns {Promise<Object>} Bulk operation result
     */
    static async bulkUpdate(Model, updates, options = {}) {
        try {
            if (!updates || updates.length === 0) {
                return { modifiedCount: 0, matchedCount: 0 };
            }

            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: update.filter,
                    update: { $set: update.data },
                    upsert: options.upsert || false
                }
            }));

            const result = await Model.bulkWrite(bulkOps, {
                ordered: options.ordered || false,
                ...options
            });

            console.log(`✅ Bulk updated ${result.modifiedCount} documents`);
            return result;

        } catch (error) {
            console.error('❌ Bulk update error:', error);
            throw error;
        }
    }

    /**
     * Bulk insert multiple documents
     * @param {Object} Model - Mongoose model
     * @param {Array} documents - Array of documents to insert
     * @param {Object} options - Insert options
     * @returns {Promise<Object>} Insert result
     */
    static async bulkInsert(Model, documents, options = {}) {
        try {
            if (!documents || documents.length === 0) {
                return { insertedCount: 0, insertedIds: [] };
            }

            const result = await Model.insertMany(documents, {
                ordered: options.ordered || false,
                ...options
            });

            console.log(`✅ Bulk inserted ${result.length} documents`);
            return {
                insertedCount: result.length,
                insertedIds: result.map(doc => doc._id)
            };

        } catch (error) {
            console.error('❌ Bulk insert error:', error);
            throw error;
        }
    }

    /**
     * Bulk delete multiple documents
     * @param {Object} Model - Mongoose model
     * @param {Array} filters - Array of delete filters
     * @param {Object} options - Delete options
     * @returns {Promise<Object>} Delete result
     */
    static async bulkDelete(Model, filters, options = {}) {
        try {
            if (!filters || filters.length === 0) {
                return { deletedCount: 0 };
            }

            const bulkOps = filters.map(filter => ({
                deleteOne: { filter }
            }));

            const result = await Model.bulkWrite(bulkOps, {
                ordered: options.ordered || false,
                ...options
            });

            console.log(`✅ Bulk deleted ${result.deletedCount} documents`);
            return result;

        } catch (error) {
            console.error('❌ Bulk delete error:', error);
            throw error;
        }
    }

    /**
     * Update vehicle statuses in bulk (common use case)
     * @param {Object} VehicleModel - Vehicle mongoose model
     * @param {Array} vehicleIds - Array of vehicle IDs
     * @param {string} status - New status
     * @param {string} updatedBy - User who updated
     * @returns {Promise<Object>} Update result
     */
    static async updateVehicleStatuses(VehicleModel, vehicleIds, status, updatedBy) {
        try {
            const updates = vehicleIds.map(id => ({
                filter: { _id: id },
                data: {
                    status,
                    updatedBy,
                    updatedAt: new Date()
                }
            }));

            return await this.bulkUpdate(VehicleModel, updates);

        } catch (error) {
            console.error('❌ Error updating vehicle statuses:', error);
            throw error;
        }
    }

    /**
     * Update warranty claim statuses in bulk
     * @param {Object} WarrantyClaimModel - WarrantyClaim mongoose model
     * @param {Array} claimIds - Array of claim IDs
     * @param {string} status - New status
     * @param {string} updatedBy - User who updated
     * @returns {Promise<Object>} Update result
     */
    static async updateClaimStatuses(WarrantyClaimModel, claimIds, status, updatedBy) {
        try {
            const updates = claimIds.map(id => ({
                filter: { _id: id },
                data: {
                    claimStatus: status,
                    updatedBy,
                    updatedAt: new Date()
                }
            }));

            return await this.bulkUpdate(WarrantyClaimModel, updates);

        } catch (error) {
            console.error('❌ Error updating claim statuses:', error);
            throw error;
        }
    }

    /**
     * Bulk update recall campaign vehicle statuses
     * @param {Object} RecallCampaignModel - RecallCampaign mongoose model
     * @param {string} campaignId - Campaign ID
     * @param {Array} vehicleUpdates - Array of vehicle status updates
     * @returns {Promise<Object>} Update result
     */
    static async updateRecallVehicleStatuses(RecallCampaignModel, campaignId, vehicleUpdates) {
        try {
            const bulkOps = vehicleUpdates.map(update => ({
                updateOne: {
                    filter: {
                        _id: campaignId,
                        'affectedVehicles.vin': update.vin
                    },
                    update: {
                        $set: {
                            'affectedVehicles.$.status': update.status,
                            'affectedVehicles.$.completedAt': update.completedAt || null,
                            'affectedVehicles.$.notes': update.notes || '',
                            updatedAt: new Date()
                        }
                    }
                }
            }));

            const result = await RecallCampaignModel.bulkWrite(bulkOps, { ordered: false });
            console.log(`✅ Bulk updated ${result.modifiedCount} recall vehicle statuses`);
            return result;

        } catch (error) {
            console.error('❌ Error updating recall vehicle statuses:', error);
            throw error;
        }
    }

    /**
     * Bulk update service center assignments
     * @param {Object} Model - Mongoose model
     * @param {Array} assignments - Array of service center assignments
     * @returns {Promise<Object>} Update result
     */
    static async updateServiceCenterAssignments(Model, assignments) {
        try {
            const updates = assignments.map(assignment => ({
                filter: { _id: assignment.id },
                data: {
                    serviceCenterId: assignment.serviceCenterId,
                    serviceCenterName: assignment.serviceCenterName,
                    serviceCenterCode: assignment.serviceCenterCode,
                    updatedAt: new Date()
                }
            }));

            return await this.bulkUpdate(Model, updates);

        } catch (error) {
            console.error('❌ Error updating service center assignments:', error);
            throw error;
        }
    }

    /**
     * Batch process with size limit to avoid memory issues
     * ⚠️ NOTE: Sequential processing is INTENTIONAL here to avoid overwhelming the database
     * This is different from N+1 query problem - we're processing in controlled batches
     * 
     * @param {Array} items - Items to process
     * @param {Function} processor - Processing function
     * @param {number} batchSize - Batch size (default: 100)
     * @returns {Promise<Array>} Array of results
     */
    static async batchProcess(items, processor, batchSize = 100) {
        try {
            const results = [];
            // to avoid overwhelming the database with too many concurrent operations
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResult = await processor(batch);
                results.push(batchResult);

                // Small delay to prevent overwhelming the database
                if (i + batchSize < items.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            return results;

        } catch (error) {
            console.error('❌ Batch processing error:', error);
            throw error;
        }
    }
}

module.exports = BulkOperationService;
