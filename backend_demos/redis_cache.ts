import { createClient } from 'redis';

// --- Redis Caching Strategy Demo ---

// Mock Database Fetch
async function getProductFromDB(id: string) {
    console.log(`[DB] Fetching product ${id}...`);
    // Simulate latency
    await new Promise(r => setTimeout(r, 500));
    return { id, name: "Sample Product", price: 100 };
}

// Redis Client (Mock setup)
const redisClient = createClient();
// redisClient.connect(); // Uncomment in real app

export async function getProduct(id: string) {
    const cacheKey = `product:${id}`;

    // 1. Check Cache
    try {
        // const cachedData = await redisClient.get(cacheKey);
        const cachedData = null; // Simulate cache miss for demo

        if (cachedData) {
            console.log(`[Cache] Hit for ${id}`);
            return JSON.parse(cachedData);
        }
    } catch (e) {
        console.error("Redis error", e);
    }

    // 2. Cache Miss -> Fetch from DB
    console.log(`[Cache] Miss for ${id}`);
    const product = await getProductFromDB(id);

    // 3. Store in Cache (TTL: 1 hour = 3600 seconds)
    try {
        // await redisClient.set(cacheKey, JSON.stringify(product), { EX: 3600 });
        console.log(`[Cache] Stored ${id} with 1h TTL`);
    } catch (e) {
        console.error("Redis set error", e);
    }

    return product;
}
