// Simple in-memory cache and rate limiter for Gemini API calls
class GeminiRateLimiter {
    constructor() {
        this.requestQueue = [];
        this.processing = false;
        this.lastRequestTime = 0;
        this.minInterval = 6000; // 6 seconds between requests (10 RPM = 1 request per 6 seconds)
        this.cache = new Map(); // Cache for PDF results
        this.maxCacheSize = 100;
    }

    // Generate cache key from PDF content
    getCacheKey(pdfText) {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < pdfText.length; i++) {
            const char = pdfText.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // Check if result is cached
    getCached(pdfText) {
        const key = this.getCacheKey(pdfText);
        const cached = this.cache.get(key);

        if (cached) {
            console.log('✅ Using cached result for PDF');
            return cached;
        }
        return null;
    }

    // Store result in cache
    setCached(pdfText, result) {
        const key = this.getCacheKey(pdfText);

        // Limit cache size
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, result);
        console.log('💾 Cached result for future use');
    }

    // Add request to queue
    async queueRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    // Process queue with rate limiting
    async processQueue() {
        if (this.processing || this.requestQueue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            // Wait if we need to respect rate limit
            if (timeSinceLastRequest < this.minInterval) {
                const waitTime = this.minInterval - timeSinceLastRequest;
                console.log(`⏳ Rate limiting: waiting ${Math.round(waitTime / 1000)}s before next request...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            const { requestFn, resolve, reject } = this.requestQueue.shift();

            try {
                this.lastRequestTime = Date.now();
                const result = await requestFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.processing = false;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }

    // Get cache stats
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.cache.size > 0 ? '~' + Math.round((this.cache.size / this.maxCacheSize) * 100) + '%' : '0%'
        };
    }
}

// Export singleton instance
export const geminiRateLimiter = new GeminiRateLimiter();
