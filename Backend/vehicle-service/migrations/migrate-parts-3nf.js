/**
 * Migration Script: PartsAttached to 3NF
 * 
 * This script migrates PartsAttached data to comply with 3NF by:
 * 1. Extracting unique parts from PartsAttached
 * 2. Creating Parts records
 * 3. Removing redundant fields (part_name, category) from PartsAttached
 * 
 * Run: node migrations/migrate-parts-3nf.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PartsAttached from '../models/PartsAttached.js';
import Parts from '../models/Parts.js';

dotenv.config();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function migrateParts() {
    try {
        log('\n🔄 Starting 3NF Migration...', 'blue');
        log('='.repeat(60));

        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        log('✅ Connected to database', 'green');

        // Step 1: Extract unique parts from PartsAttached
        log('\n📊 Step 1: Extracting unique parts...', 'blue');

        const uniqueParts = await PartsAttached.aggregate([
            {
                $group: {
                    _id: '$part_id',
                    part_name: { $first: '$part_name' },
                    category: { $first: '$category' },
                    count: { $sum: 1 }
                }
            }
        ]);

        log(`   Found ${uniqueParts.length} unique parts`, 'yellow');

        // Step 2: Create Parts records
        log('\n📝 Step 2: Creating Parts records...', 'blue');

        let created = 0;
        let skipped = 0;

        for (const part of uniqueParts) {
            try {
                // Check if part already exists
                const existing = await Parts.findOne({ part_id: part._id });

                if (existing) {
                    log(`   ⏭️  Skipped: ${part._id} (already exists)`, 'yellow');
                    skipped++;
                    continue;
                }

                // Create new part
                await Parts.create({
                    part_id: part._id,
                    part_name: part.part_name || 'Unknown Part',
                    category: part.category || 'other',
                    status: 'active'
                });

                log(`   ✅ Created: ${part._id} - ${part.part_name} (used ${part.count} times)`, 'green');
                created++;
            } catch (error) {
                log(`   ❌ Error creating ${part._id}: ${error.message}`, 'red');
            }
        }

        log(`\n   Summary: ${created} created, ${skipped} skipped`, 'blue');

        // Step 3: Remove redundant fields from PartsAttached
        log('\n🗑️  Step 3: Removing redundant fields...', 'blue');

        const result = await PartsAttached.updateMany(
            {},
            { $unset: { part_name: '', category: '' } }
        );

        log(`   ✅ Updated ${result.modifiedCount} PartsAttached records`, 'green');

        // Verification
        log('\n✅ Step 4: Verification...', 'blue');

        const partsCount = await Parts.countDocuments();
        const attachedCount = await PartsAttached.countDocuments();
        const withPartName = await PartsAttached.countDocuments({ part_name: { $exists: true } });
        const withCategory = await PartsAttached.countDocuments({ category: { $exists: true } });

        log(`   Parts table: ${partsCount} records`);
        log(`   PartsAttached table: ${attachedCount} records`);
        log(`   Records with part_name: ${withPartName} (should be 0)`, withPartName === 0 ? 'green' : 'red');
        log(`   Records with category: ${withCategory} (should be 0)`, withCategory === 0 ? 'green' : 'red');

        log('\n' + '='.repeat(60));
        log('✅ Migration completed successfully!', 'green');
        log('\n📊 Results:', 'blue');
        log(`   - ${created} new Parts created`);
        log(`   - ${result.modifiedCount} PartsAttached records updated`);
        log(`   - Data is now 3NF compliant!`);

    } catch (error) {
        log(`\n❌ Migration failed: ${error.message}`, 'red');
        console.error(error);
    } finally {
        await mongoose.disconnect();
        log('\n👋 Disconnected from database', 'blue');
    }
}

// Run migration
migrateParts();
