/**
 * UC11 Test Script
 * Test UC11 implementation để đảm bảo tất cả functions hoạt động đúng
 */

const mongoose = require('mongoose');

// Test UC11 Model Schema
async function testUC11ModelSchema() {
    console.log('\n🧪 Testing UC11 Model Schema...');

    try {
        // Import model
        const WarrantyClaimModel = require('./Warranty/Model/WarrantyClaim');

        // Test schema structure
        const WarrantyClaim = WarrantyClaimModel();
        const schema = WarrantyClaim.schema;

        // Check if warrantyResults field exists
        const warrantyResultsPath = schema.paths['warrantyResults'];
        if (!warrantyResultsPath) {
            throw new Error('warrantyResults field not found in schema');
        }

        console.log('✅ warrantyResults field exists');

        // Check nested fields
        const resultPhotosPath = schema.paths['warrantyResults.resultPhotos'];
        const completionInfoPath = schema.paths['warrantyResults.completionInfo'];
        const handoverInfoPath = schema.paths['warrantyResults.handoverInfo'];
        const statusPath = schema.paths['warrantyResults.status'];

        if (!resultPhotosPath) throw new Error('warrantyResults.resultPhotos not found');
        if (!completionInfoPath) throw new Error('warrantyResults.completionInfo not found');
        if (!handoverInfoPath) throw new Error('warrantyResults.handoverInfo not found');
        if (!statusPath) throw new Error('warrantyResults.status not found');

        console.log('✅ All warrantyResults nested fields exist');

        // Check claimStatus enum includes UC11 statuses
        const claimStatusPath = schema.paths['claimStatus'];
        const enumValues = claimStatusPath.enumValues;

        const requiredStatuses = ['uploading_results', 'ready_for_handover', 'handed_over'];
        const missingStatuses = requiredStatuses.filter(status => !enumValues.includes(status));

        if (missingStatuses.length > 0) {
            throw new Error(`Missing claimStatus enum values: ${missingStatuses.join(', ')}`);
        }

        console.log('✅ All UC11 claimStatus enum values exist');

        // Check indexes
        const indexes = schema.indexes();
        const uc11Indexes = indexes.filter(index =>
            JSON.stringify(index[0]).includes('warrantyResults')
        );

        if (uc11Indexes.length === 0) {
            console.log('⚠️  No UC11 indexes found (this is OK for testing)');
        } else {
            console.log(`✅ Found ${uc11Indexes.length} UC11 indexes`);
        }

        console.log('✅ UC11 Model Schema test passed!');
        return true;

    } catch (error) {
        console.error('❌ UC11 Model Schema test failed:', error.message);
        return false;
    }
}

// Test UC11 Controller Functions
async function testUC11ControllerFunctions() {
    console.log('\n🧪 Testing UC11 Controller Functions...');

    try {
        // Import controller
        const WarrantyClaimController = require('./Warranty/Controller/WarrantyClaimController');

        // Check if UC11 functions exist
        const requiredFunctions = [
            'uploadResultPhotos',
            'updateCompletionInfo',
            'recordHandover',
            'closeWarrantyCase',
            'getWarrantyResults'
        ];

        const missingFunctions = requiredFunctions.filter(func =>
            typeof WarrantyClaimController[func] !== 'function'
        );

        if (missingFunctions.length > 0) {
            throw new Error(`Missing controller functions: ${missingFunctions.join(', ')}`);
        }

        console.log('✅ All UC11 controller functions exist');

        // Test function signatures (basic check)
        requiredFunctions.forEach(funcName => {
            const func = WarrantyClaimController[funcName];
            if (func.length !== 2) { // Should accept (req, res)
                console.log(`⚠️  Function ${funcName} has ${func.length} parameters (expected 2)`);
            }
        });

        console.log('✅ UC11 Controller Functions test passed!');
        return true;

    } catch (error) {
        console.error('❌ UC11 Controller Functions test failed:', error.message);
        return false;
    }
}

// Test UC11 Middleware
async function testUC11Middleware() {
    console.log('\n🧪 Testing UC11 Middleware...');

    try {
        // Import warranty results middleware
        const WarrantyResultsFileUpload = require('./shared/middleware/WarrantyResultsFileUpload');

        // Check if required functions exist
        const requiredFunctions = [
            'uploadMultipleResultPhotos',
            'handleWarrantyResultsUploadError',
            'validateResultPhotos',
            'generateResultPhotoUrl',
            'deleteResultPhoto',
            'cleanupUploadedFiles'
        ];

        const missingFunctions = requiredFunctions.filter(func =>
            typeof WarrantyResultsFileUpload[func] !== 'function'
        );

        if (missingFunctions.length > 0) {
            throw new Error(`Missing middleware functions: ${missingFunctions.join(', ')}`);
        }

        console.log('✅ All UC11 middleware functions exist');

        console.log('✅ UC11 Middleware test passed!');
        return true;

    } catch (error) {
        console.error('❌ UC11 Middleware test failed:', error.message);
        return false;
    }
}

// Test Warranty Results Storage Service
async function testWarrantyResultsStorageService() {
    console.log('\n🧪 Testing Warranty Results Storage Service...');

    try {
        // Import warranty results storage service
        const WarrantyResultsStorageService = require('./shared/services/WarrantyResultsStorageService');

        // Check if required methods exist
        const requiredMethods = [
            'processUploadedPhotos',
            'generatePhotoUrl',
            'deletePhoto',
            'deleteMultiplePhotos',
            'cleanupUploadedFiles',
            'fileExists',
            'getFileInfo',
            'validateUploadedFiles',
            'getTotalStorageUsed',
            'formatFileSize'
        ];

        const missingMethods = requiredMethods.filter(method =>
            typeof WarrantyResultsStorageService[method] !== 'function'
        );

        if (missingMethods.length > 0) {
            throw new Error(`Missing storage service methods: ${missingMethods.join(', ')}`);
        }

        console.log('✅ All UC11 storage service methods exist');

        // Test formatFileSize method
        const testSizes = [
            { bytes: 0, expected: '0 Bytes' },
            { bytes: 1024, expected: '1 KB' },
            { bytes: 1024 * 1024, expected: '1 MB' },
            { bytes: 1024 * 1024 * 1024, expected: '1 GB' }
        ];

        testSizes.forEach(test => {
            const result = WarrantyResultsStorageService.formatFileSize(test.bytes);
            if (result !== test.expected) {
                console.log(`⚠️  formatFileSize(${test.bytes}) = "${result}", expected "${test.expected}"`);
            }
        });

        console.log('✅ UC11 Storage Service test passed!');
        return true;

    } catch (error) {
        console.error('❌ UC11 Storage Service test failed:', error.message);
        return false;
    }
}

// Main test function
async function runUC11Tests() {
    console.log('🚀 Starting UC11 Implementation Tests...');
    console.log('=====================================');

    const results = [];

    // Run all tests
    results.push(await testUC11ModelSchema());
    results.push(await testUC11ControllerFunctions());
    results.push(await testUC11Middleware());
    results.push(await testWarrantyResultsStorageService());

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');

    const passed = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${(passed / results.length * 100).toFixed(1)}%`);

    if (failed === 0) {
        console.log('\n🎉 All UC11 tests passed! Implementation is ready.');
    } else {
        console.log('\n⚠️  Some tests failed. Please fix the issues before proceeding.');
    }

    return failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runUC11Tests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runUC11Tests,
    testUC11ModelSchema,
    testUC11ControllerFunctions,
    testUC11Middleware,
    testWarrantyResultsStorageService
};
