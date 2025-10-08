const redisService = require('./RedisService');

/**
 * Get cached data with automatic JSON parsing
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Parsed data or null
 */
const getCached = async (cacheKey) => {
    try {
        const cachedData = await redisService.get(cacheKey);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
        console.error('❌ Error getting cached data:', error.message);
        return null;
    }
};

/**
 * Set cached data with automatic JSON stringification
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<void>}
 */
const setCached = async (cacheKey, data, ttl = 300) => {
    try {
        await redisService.set(cacheKey, JSON.stringify(data), ttl);
    } catch (error) {
        console.error('❌ Error setting cached data:', error.message);
    }
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Cache key pattern (e.g., "parts:*")
 * @returns {Promise<void>}
 */
const clearCachePattern = async (pattern) => {
    try {
        await redisService.deletePatternScan(pattern);
    } catch (error) {
        console.error(`❌ Error clearing cache pattern ${pattern}:`, error.message);
    }
};

/**
 * Clear multiple cache patterns
 * @param {string[]} patterns - Array of cache key patterns
 * @returns {Promise<void>}
 */
const clearCachePatterns = async (patterns) => {
    try {
        await Promise.all(patterns.map(pattern => clearCachePattern(pattern)));
    } catch (error) {
        console.error('❌ Error clearing multiple cache patterns:', error.message);
    }
};

/**
 * Delete specific cache key
 * @param {string} cacheKey - Cache key to delete
 * @returns {Promise<void>}
 */
const deleteCached = async (cacheKey) => {
    try {
        await redisService.del(cacheKey);
    } catch (error) {
        console.error('❌ Error deleting cached data:', error.message);
    }
};

/**
 * Build cache key from query parameters
 * @param {string} prefix - Cache key prefix
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
const buildCacheKey = (prefix, params = {}) => {
    const parts = [prefix];

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            parts.push(`${key}:${value}`);
        }
    }

    return parts.join(':');
};

module.exports = {
    getCached,
    setCached,
    clearCachePattern,
    clearCachePatterns,
    deleteCached,
    buildCacheKey
};
