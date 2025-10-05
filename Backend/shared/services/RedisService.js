const redis = require('redis');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

            this.client = redis.createClient({
                url: redisUrl,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            return false; // Stop reconnecting
                        }
                        const delay = Math.min(retries * 100, 3000);
                        return delay;
                    },
                    connectTimeout: 10000,
                    lazyConnect: true
                }
            });

            this.client.on('error', () => {
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                this.isConnected = true;
            });

            this.client.on('disconnect', () => {
                this.isConnected = false;
            });

            await this.client.connect();
            return true;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.isConnected = false;
        }
    }

    // Cache user data
    async cacheUser(userId, userData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `user:${userId}`;
            await this.client.setEx(key, ttl, JSON.stringify(userData));
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUser(userId) {
        if (!this.isConnected) return null;

        try {
            const key = `user:${userId}`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    // Cache technicians list
    async cacheTechnicians(filters, technicians, ttl = 300) {
        if (!this.isConnected) return false;

        try {
            const filterKey = JSON.stringify(filters || {});
            const key = `technicians:${Buffer.from(filterKey).toString('base64')}`;
            await this.client.setEx(key, ttl, JSON.stringify(technicians));
            return true;
        } catch (error) {
            return false;
        }
    }

    async getTechnicians(filters) {
        if (!this.isConnected) return null;

        try {
            const filterKey = JSON.stringify(filters || {});
            const key = `technicians:${Buffer.from(filterKey).toString('base64')}`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    // Cache vehicle model data (for UC1: Vehicle Registration by VIN)
    async cacheVehicleModel(model, modelData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `vehicle:model:${model}`;
            await this.client.setEx(key, ttl, JSON.stringify(modelData));
            return true;
        } catch (error) {
            return false;
        }
    }

    async getVehicleModel(model) {
        if (!this.isConnected) return null;

        try {
            const key = `vehicle:model:${model}`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    // Cache vehicle data by VIN
    async cacheVehicleByVin(vin, vehicleData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `vehicle:vin:${vin}`;
            await this.client.setEx(key, ttl, JSON.stringify(vehicleData));
            return true;
        } catch (error) {
            return false;
        }
    }

    async getVehicleByVin(vin) {
        if (!this.isConnected) return null;

        try {
            const key = `vehicle:vin:${vin}`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    // Cache invalidation methods
    async invalidateUser(userId) {
        if (!this.isConnected) return false;

        try {
            const key = `user:${userId}`;
            await this.client.del(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    async invalidateVehicle(vin) {
        if (!this.isConnected) return false;

        try {
            const key = `vehicle:vin:${vin}`;
            await this.client.del(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    async invalidateVehicleParts(vehicleId) {
        if (!this.isConnected) return false;

        try {
            const key = `parts:${vehicleId}`;
            await this.client.del(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Invalidate technicians cache
    async invalidateTechnicians() {
        if (!this.isConnected) return false;

        try {
            let deletedCount = 0;
            let cursor = '0';

            // Use SCAN instead of KEYS to avoid blocking Redis
            do {
                const result = await this.client.scan(cursor, {
                    MATCH: 'technicians:*',
                    COUNT: 100
                });

                cursor = result.cursor;
                const keys = result.keys;

                if (keys.length > 0) {
                    await this.client.del(keys);
                    deletedCount += keys.length;
                }
            } while (cursor !== '0');

            return true;
        } catch (error) {
            return false;
        }
    }

    // Generic cache methods
    async set(key, value, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            await this.client.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    async get(key) {
        if (!this.isConnected) return null;

        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    async del(key) {
        if (!this.isConnected) return false;

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Cache service center data
    async cacheServiceCenter(centerId, centerData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `servicecenter:${centerId}`;
            await this.client.setEx(key, ttl, JSON.stringify(centerData));
            return true;
        } catch (error) {
            return false;
        }
    }

    async getServiceCenter(centerId) {
        if (!this.isConnected) return null;

        try {
            const key = `servicecenter:${centerId}`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    // Cache warranty policy data (for UC20)
    async cacheWarrantyPolicy(policyId, policyData, ttl = 86400) {
        if (!this.isConnected) return false;

        try {
            const key = `policy:warranty:${policyId}`;
            await this.client.setEx(key, ttl, JSON.stringify(policyData));
            return true;
        } catch (error) {
            return false;
        }
    }

    async getWarrantyPolicy(policyId) {
        if (!this.isConnected) return null;

        try {
            const key = `policy:warranty:${policyId}`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            return null;
        }
    }

    // Health check
    async ping() {
        if (!this.isConnected) return false;

        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            return false;
        }
    }

    // Delete keys matching pattern (safe wildcard deletion)
    async deletePattern(pattern) {
        if (!this.isConnected) {
            return 0;
        }

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }

            // Delete keys in batches to avoid blocking Redis
            const batchSize = 100;
            let deletedCount = 0;

            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);
                const result = await this.client.del(batch);
                deletedCount += result;
            }

            return deletedCount;
        } catch (error) {
            return 0;
        }
    }

    // Invalidate specific cache keys (better performance than pattern scan)
    async invalidateSpecificKeys(keys) {
        if (!this.isConnected || !keys || keys.length === 0) {
            return 0;
        }

        try {
            const deletedCount = await this.client.del(keys);
            console.log(`✅ Invalidated ${deletedCount} specific cache keys`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Error invalidating specific cache keys:', error);
            return 0;
        }
    }

    // Alternative using SCAN for better performance (non-blocking)
    async deletePatternScan(pattern) {
        if (!this.isConnected) {
            return 0;
        }

        try {
            let cursor = 0;
            let deletedCount = 0;
            const batchSize = 100;

            do {
                const result = await this.client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: batchSize
                });

                cursor = result.cursor;
                const keys = result.keys;

                if (keys.length > 0) {
                    const deleted = await this.client.del(keys);
                    deletedCount += deleted;
                }
            } while (cursor !== 0);

            return deletedCount;
        } catch (error) {
            return 0;
        }
    }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
