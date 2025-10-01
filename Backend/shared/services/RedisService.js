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
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.error('Redis connection refused');
                        return new Error('Redis connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
            });

            this.client.on('disconnect', () => {
                console.log('❌ Redis disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
            return true;
        } catch (error) {
            console.error('Redis connection failed:', error);
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
            console.error('Cache user error:', error);
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
            console.error('Get cached user error:', error);
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
            console.error('Cache technicians error:', error);
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
            console.error('Get cached technicians error:', error);
            return null;
        }
    }

    // Cache vehicle model data (for UC1: Vehicle Registration by VIN)
    async cacheVehicleModel(model, modelData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `vehicle:model:${model}`;
            await this.client.setEx(key, ttl, JSON.stringify(modelData));
            console.log(`📦 Cached vehicle model: ${model}`);
            return true;
        } catch (error) {
            console.error('Cache vehicle model error:', error);
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
            console.error('Get cached vehicle model error:', error);
            return null;
        }
    }

    // Cache vehicle data by VIN
    async cacheVehicleByVin(vin, vehicleData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `vehicle:vin:${vin}`;
            await this.client.setEx(key, ttl, JSON.stringify(vehicleData));
            console.log(`🚗 Cached vehicle: ${vin}`);
            return true;
        } catch (error) {
            console.error('Cache vehicle by VIN error:', error);
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
            console.error('Get cached vehicle by VIN error:', error);
            return null;
        }
    }

    // Cache invalidation methods
    async invalidateUser(userId) {
        if (!this.isConnected) return false;

        try {
            const key = `user:${userId}`;
            await this.client.del(key);
            console.log(`🗑️ Invalidated user cache: ${userId}`);
            return true;
        } catch (error) {
            console.error('Invalidate user cache error:', error);
            return false;
        }
    }

    async invalidateVehicle(vin) {
        if (!this.isConnected) return false;

        try {
            const key = `vehicle:vin:${vin}`;
            await this.client.del(key);
            console.log(`🗑️ Invalidated vehicle cache: ${vin}`);
            return true;
        } catch (error) {
            console.error('Invalidate vehicle cache error:', error);
            return false;
        }
    }

    async invalidateVehicleParts(vehicleId) {
        if (!this.isConnected) return false;

        try {
            const key = `parts:${vehicleId}`;
            await this.client.del(key);
            console.log(`🗑️ Invalidated vehicle parts cache: ${vehicleId}`);
            return true;
        } catch (error) {
            console.error('Invalidate vehicle parts cache error:', error);
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

            if (deletedCount > 0) {
                console.log(`🗑️ Invalidated ${deletedCount} technician cache entries`);
            }
            return true;
        } catch (error) {
            console.error('Invalidate technicians cache error:', error);
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
            console.error('Redis set error:', error);
            return false;
        }
    }

    async get(key) {
        if (!this.isConnected) return null;

        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    async del(key) {
        if (!this.isConnected) return false;

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Redis del error:', error);
            return false;
        }
    }

    // Cache service center data
    async cacheServiceCenter(centerId, centerData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `servicecenter:${centerId}`;
            await this.client.setEx(key, ttl, JSON.stringify(centerData));
            console.log(`🏢 Cached service center: ${centerId}`);
            return true;
        } catch (error) {
            console.error('Cache service center error:', error);
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
            console.error('Get cached service center error:', error);
            return null;
        }
    }

    // Cache warranty policy data (for UC20)
    async cacheWarrantyPolicy(policyId, policyData, ttl = 86400) {
        if (!this.isConnected) return false;

        try {
            const key = `policy:warranty:${policyId}`;
            await this.client.setEx(key, ttl, JSON.stringify(policyData));
            console.log(`📋 Cached warranty policy: ${policyId}`);
            return true;
        } catch (error) {
            console.error('Cache warranty policy error:', error);
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
            console.error('Get cached warranty policy error:', error);
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
            console.error('Redis ping error:', error);
            return false;
        }
    }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
