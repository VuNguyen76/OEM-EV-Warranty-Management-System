// shared/utils/generateSecret.js
// Utility to generate secure JWT secrets

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random JWT secret
 * @param {number} length - Length of the secret in bytes (default: 64)
 * @returns {string} - Hex encoded secret
 */
function generateJWTSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate multiple secrets for rotation
 * @param {number} count - Number of secrets to generate
 * @param {number} length - Length of each secret in bytes
 * @returns {Array<string>} - Array of hex encoded secrets
 */
function generateMultipleSecrets(count = 3, length = 64) {
    const secrets = [];
    for (let i = 0; i < count; i++) {
        secrets.push(generateJWTSecret(length));
    }
    return secrets;
}

/**
 * Validate JWT secret strength
 * @param {string} secret - Secret to validate
 * @returns {Object} - Validation result
 */
function validateSecretStrength(secret) {
    const result = {
        isValid: false,
        issues: [],
        strength: 'weak'
    };

    if (!secret) {
        result.issues.push('Secret is empty');
        return result;
    }

    if (secret.length < 32) {
        result.issues.push('Secret is too short (minimum 32 characters)');
    }

    if (secret.length < 64) {
        result.issues.push('Secret should be at least 64 characters for better security');
    }

    // Check for common weak patterns
    if (/^[0-9]+$/.test(secret)) {
        result.issues.push('Secret contains only numbers');
    }

    if (/^[a-zA-Z]+$/.test(secret)) {
        result.issues.push('Secret contains only letters');
    }

    if (secret === secret.toLowerCase() || secret === secret.toUpperCase()) {
        result.issues.push('Secret should contain mixed case characters');
    }

    // Determine strength
    if (result.issues.length === 0) {
        result.strength = 'strong';
        result.isValid = true;
    } else if (result.issues.length <= 2) {
        result.strength = 'medium';
        result.isValid = secret.length >= 32;
    }

    return result;
}

// If run directly, generate and display new secrets
if (require.main === module) {
    console.log('🔐 JWT Secret Generator');
    console.log('='.repeat(50));
    
    console.log('\n📝 New JWT Secret:');
    const newSecret = generateJWTSecret();
    console.log(newSecret);
    
    console.log('\n🔄 Multiple Secrets for Rotation:');
    const multipleSecrets = generateMultipleSecrets(3);
    multipleSecrets.forEach((secret, index) => {
        console.log(`Secret ${index + 1}: ${secret}`);
    });
    
    console.log('\n⚠️  Current Secret Validation:');
    const currentSecret = '17c1f23b1afa99f9577811d98b1a7e6ae546933790e5b8aac76aa6cd22a46908';
    const validation = validateSecretStrength(currentSecret);
    console.log(`Strength: ${validation.strength}`);
    console.log(`Valid: ${validation.isValid}`);
    if (validation.issues.length > 0) {
        console.log('Issues:');
        validation.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log('\n💡 Recommendation: Use the new generated secret above');
    console.log('   Update your .env and docker-compose.yml files');
}

module.exports = {
    generateJWTSecret,
    generateMultipleSecrets,
    validateSecretStrength
};
