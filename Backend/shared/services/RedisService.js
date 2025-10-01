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

    // Cache JWT verification
    async cacheJWT(token, userData, ttl = 3600) {
        if (!this.isConnected) return false;

        try {
            const key = `jwt:${token}`;
            await this.client.setEx(key, ttl, JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('Cache JWT error:', error);
            return false;
        }
    }

    async getJWT(token) {
        if (!this.isConnected) return null;

        try {
            const key = `jwt:${token}`;
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Get cached JWT error:', error);
            return null;
        }
    }

    // Invalidate user cache
    async invalidateUser(userId) {
        if (!this.isConnected) return false;

        try {
            const key = `user:${userId}`;
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Invalidate user cache error:', error);
            return false;
        }
    }

    // Invalidate technicians cache
    async invalidateTechnicians() {
        if (!this.isConnected) return false;

        try {
            const keys = await this.client.keys('technicians:*');
            if (keys.length > 0) {
                await this.client.del(keys);
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

    // Token Blacklist Methods
    async blacklistToken(token, ttl = 86400) {
        if (!this.isConnected) return false;

        try {
            const key = `blacklist:${token}`;
            await this.client.setEx(key, ttl, 'blacklisted');
            console.log(`🚫 Token blacklisted: ${token.substring(0, 20)}...`);
            return true;
        } catch (error) {
            console.error('Blacklist token error:', error);
            return false;
        }
    }

    async isTokenBlacklisted(token) {
        if (!this.isConnected) return false;

        try {
            const key = `blacklist:${token}`;
            const result = await this.client.get(key);
            return result === 'blacklisted';
        } catch (error) {
            console.error('Check blacklist error:', error);
            return false;
        }
    }

    async blacklistUserTokens(userId, ttl = 86400) {
        if (!this.isConnected) return false;

        try {
            // Blacklist all JWT cache entries for this user
            const jwtKeys = await this.client.keys('jwt:*');
            let blacklistedCount = 0;

            for (const jwtKey of jwtKeys) {
                const tokenData = await this.client.get(jwtKey);
                if (tokenData) {
                    const parsed = JSON.parse(tokenData);
                    if (parsed.userId === userId) {
                        const token = jwtKey.replace('jwt:', '');
                        await this.blacklistToken(token, ttl);
                        await this.client.del(jwtKey); // Remove from cache
                        blacklistedCount++;
                    }
                }
            }

            console.log(`🚫 Blacklisted ${blacklistedCount} tokens for user ${userId}`);
            return blacklistedCount;
        } catch (error) {
            console.error('Blacklist user tokens error:', error);
            return 0;
        }
    }

    async cleanupExpiredBlacklist() {
        if (!this.isConnected) return false;

        try {
            const blacklistKeys = await this.client.keys('blacklist:*');
            let cleanedCount = 0;

            for (const key of blacklistKeys) {
                const ttl = await this.client.ttl(key);
                if (ttl === -1) { // No expiry set
                    await this.client.del(key);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} expired blacklist entries`);
            }
            return cleanedCount;
        } catch (error) {
            console.error('Cleanup blacklist error:', error);
            return 0;
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
