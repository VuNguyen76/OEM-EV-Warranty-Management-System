const schedule = require('node-schedule');

let Reservation = null;

const initializeReservationReleaseJob = (reservationModel) => {
    Reservation = reservationModel;
    
    // Run every 5 minutes (*/5 * * * *)
    const job = schedule.scheduleJob('*/5 * * * *', async () => {
        try {
            if (!Reservation) {
                console.error('❌ Reservation model not initialized');
                return;
            }
            
            const releasedCount = await Reservation.releaseExpiredReservations();
            
            if (releasedCount > 0) {
                console.log(`✅ Reservation release job completed: ${releasedCount} reservations released`);
            }
            
        } catch (error) {
            console.error('❌ Error in reservation release job:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    console.log('✅ Reservation release job scheduled (every 5 minutes)');
    return job;
};

const stopReservationReleaseJob = (job) => {
    if (job) {
        job.cancel();
        console.log('✅ Reservation release job stopped');
    }
};

module.exports = {
    initializeReservationReleaseJob,
    stopReservationReleaseJob
};
