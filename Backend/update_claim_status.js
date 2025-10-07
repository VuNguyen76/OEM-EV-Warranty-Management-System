const mongoose = require('mongoose');
const { connectToWarrantyDB } = require('./shared/database/warrantyConnection');
const WarrantyClaimModel = require('./Warranty/Model/WarrantyClaim');

async function updateClaimStatus() {
    try {
        // Connect to database
        await connectToWarrantyDB();

        const WarrantyClaim = WarrantyClaimModel();

        // Update claim to under_review status
        const claimId = '68e51dc0535d74db649b1ed7';

        const claim = await WarrantyClaim.findById(claimId);
        if (!claim) {
            console.log('Claim not found');
            return;
        }

        console.log('Current status:', claim.claimStatus);

        // Set temporary fields for pre-save middleware
        claim._statusChangedBy = 'admin3@example.com';
        claim._statusChangeReason = 'Setting to under_review for approval testing';
        claim._statusChangeNotes = 'UC9 test preparation';

        // Update status
        claim.claimStatus = 'under_review';

        await claim.save();

        console.log('✅ Claim status updated to under_review');

        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateClaimStatus();
