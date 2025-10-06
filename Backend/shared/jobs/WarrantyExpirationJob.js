const schedule = require('node-schedule');

let WarrantyVehicle = null;

const initializeWarrantyExpirationJob = (warrantyVehicleModel) => {
    WarrantyVehicle = warrantyVehicleModel;
    
    // Run daily at midnight (0 0 * * *)
    const job = schedule.scheduleJob('0 0 * * *', async () => {
        try {
            console.log('🕛 Starting warranty expiration job...');
            
            if (!WarrantyVehicle) {
                console.error('❌ WarrantyVehicle model not initialized');
                return;
            }
            
            const result = await WarrantyVehicle.expireOverdueWarranties();
            
            if (result.modifiedCount > 0) {
                console.log(`✅ Warranty expiration job completed: ${result.modifiedCount} warranties expired`);
            } else {
                console.log('✅ Warranty expiration job completed: No warranties to expire');
            }
            
        } catch (error) {
            console.error('❌ Error in warranty expiration job:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    console.log('✅ Warranty expiration job scheduled (daily at midnight)');
    return job;
};

const stopWarrantyExpirationJob = (job) => {
    if (job) {
        job.cancel();
        console.log('✅ Warranty expiration job stopped');
    }
};

module.exports = {
    initializeWarrantyExpirationJob,
    stopWarrantyExpirationJob
};
