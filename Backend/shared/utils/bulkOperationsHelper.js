/**
 * Bulk Operations Helper
 * ✅ PERFORMANCE FIX: Utility functions for efficient bulk database operations
 * 
 * Instead of updating documents one by one in a loop (N database calls),
 * use bulk operations to update multiple documents in a single call.
 * 
 * Performance improvement: 10-100x faster for large datasets
 */

/**
 * Bulk update multiple documents
 * @param {Model} Model - Mongoose model
 * @param {Array} updates - Array of {filter, update} objects
 * @returns {Promise<Object>} Bulk write result
 * 
 * @example
 * await bulkUpdate(Vehicle, [
 *   { filter: { _id: id1 }, update: { status: 'active' } },
 *   { filter: { _id: id2 }, update: { status: 'inactive' } }
 * ]);
 */
const bulkUpdate = async (Model, updates) => {
    if (!updates || updates.length === 0) {
        return { modifiedCount: 0, matchedCount: 0 };
    }

    const bulkOps = updates.map(({ filter, update }) => ({
        updateOne: {
            filter,
            update: { $set: update }
        }
    }));

    try {
        const result = await Model.bulkWrite(bulkOps, { ordered: false });
        console.log(`✅ Bulk update completed: ${result.modifiedCount} documents modified`);
        return result;
    } catch (error) {
        console.error('❌ Bulk update error:', error);
        throw error;
    }
};

/**
 * Bulk insert multiple documents
 * @param {Model} Model - Mongoose model
 * @param {Array} documents - Array of documents to insert
 * @returns {Promise<Object>} Insert result
 * 
 * @example
 * await bulkInsert(Vehicle, [
 *   { vin: 'VIN1', modelName: 'VF8' },
 *   { vin: 'VIN2', modelName: 'VF9' }
 * ]);
 */
const bulkInsert = async (Model, documents) => {
    if (!documents || documents.length === 0) {
        return { insertedCount: 0 };
    }

    try {
        const result = await Model.insertMany(documents, { ordered: false });
        console.log(`✅ Bulk insert completed: ${result.length} documents inserted`);
        return { insertedCount: result.length, insertedIds: result.map(doc => doc._id) };
    } catch (error) {
        console.error('❌ Bulk insert error:', error);
        throw error;
    }
};

/**
 * Bulk delete multiple documents
 * @param {Model} Model - Mongoose model
 * @param {Array} filters - Array of filter objects
 * @returns {Promise<Object>} Delete result
 * 
 * @example
 * await bulkDelete(Vehicle, [
 *   { _id: id1 },
 *   { _id: id2 }
 * ]);
 */
const bulkDelete = async (Model, filters) => {
    if (!filters || filters.length === 0) {
        return { deletedCount: 0 };
    }

    const bulkOps = filters.map(filter => ({
        deleteOne: { filter }
    }));

    try {
        const result = await Model.bulkWrite(bulkOps, { ordered: false });
        console.log(`✅ Bulk delete completed: ${result.deletedCount} documents deleted`);
        return result;
    } catch (error) {
        console.error('❌ Bulk delete error:', error);
        throw error;
    }
};

/**
 * Bulk upsert (update or insert) multiple documents
 * @param {Model} Model - Mongoose model
 * @param {Array} operations - Array of {filter, update} objects
 * @returns {Promise<Object>} Upsert result
 * 
 * @example
 * await bulkUpsert(Vehicle, [
 *   { filter: { vin: 'VIN1' }, update: { status: 'active' } },
 *   { filter: { vin: 'VIN2' }, update: { status: 'inactive' } }
 * ]);
 */
const bulkUpsert = async (Model, operations) => {
    if (!operations || operations.length === 0) {
        return { upsertedCount: 0, modifiedCount: 0 };
    }

    const bulkOps = operations.map(({ filter, update }) => ({
        updateOne: {
            filter,
            update: { $set: update },
            upsert: true
        }
    }));

    try {
        const result = await Model.bulkWrite(bulkOps, { ordered: false });
        console.log(`✅ Bulk upsert completed: ${result.upsertedCount} inserted, ${result.modifiedCount} modified`);
        return result;
    } catch (error) {
        console.error('❌ Bulk upsert error:', error);
        throw error;
    }
};

/**
 * Batch process large arrays in chunks to avoid memory issues
 * @param {Array} items - Array of items to process
 * @param {Function} processFn - Async function to process each batch
 * @param {Number} batchSize - Size of each batch (default: 100)
 * @returns {Promise<Array>} Array of results from each batch
 * 
 * @example
 * await batchProcess(vehicles, async (batch) => {
 *   return await bulkUpdate(Vehicle, batch);
 * }, 100);
 */
const batchProcess = async (items, processFn, batchSize = 100) => {
    if (!items || items.length === 0) {
        return [];
    }

    const results = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    console.log(`🔄 Processing ${items.length} items in ${totalBatches} batches of ${batchSize}`);

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        console.log(`⏳ Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

        try {
            const result = await processFn(batch);
            results.push(result);
        } catch (error) {
            console.error(`❌ Error processing batch ${batchNumber}:`, error);
            throw error;
        }
    }

    console.log(`✅ Batch processing completed: ${totalBatches} batches processed`);
    return results;
};

/**
 * Update multiple documents by IDs
 * @param {Model} Model - Mongoose model
 * @param {Array} ids - Array of document IDs
 * @param {Object} update - Update object
 * @returns {Promise<Object>} Update result
 * 
 * @example
 * await bulkUpdateByIds(Vehicle, [id1, id2, id3], { status: 'active' });
 */
const bulkUpdateByIds = async (Model, ids, update) => {
    if (!ids || ids.length === 0) {
        return { modifiedCount: 0 };
    }

    const updates = ids.map(id => ({
        filter: { _id: id },
        update
    }));

    return await bulkUpdate(Model, updates);
};

/**
 * Bulk update with different values for each document
 * @param {Model} Model - Mongoose model
 * @param {Array} updates - Array of {id, data} objects
 * @returns {Promise<Object>} Update result
 * 
 * @example
 * await bulkUpdateWithDifferentValues(Vehicle, [
 *   { id: id1, data: { status: 'active', mileage: 1000 } },
 *   { id: id2, data: { status: 'inactive', mileage: 2000 } }
 * ]);
 */
const bulkUpdateWithDifferentValues = async (Model, updates) => {
    if (!updates || updates.length === 0) {
        return { modifiedCount: 0 };
    }

    const bulkUpdates = updates.map(({ id, data }) => ({
        filter: { _id: id },
        update: data
    }));

    return await bulkUpdate(Model, bulkUpdates);
};

module.exports = {
    bulkUpdate,
    bulkInsert,
    bulkDelete,
    bulkUpsert,
    batchProcess,
    bulkUpdateByIds,
    bulkUpdateWithDifferentValues
};
