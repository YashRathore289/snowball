'use client'

// Memory cache for preserving component state across tab switches
const componentCache = new Map();

// Track component sizes to monitor memory
const sizeTracker = new Map();

// Default TTL: 15 minutes
const DEFAULT_TTL = 15 * 60 * 1000;

// Maximum total cache size: 50MB (browser limit ~2-4GB per tab, so 50MB is very safe)
const MAX_TOTAL_SIZE_MB = 50;

// Auto-cleanup interval: every 5 minutes
setInterval(() => {
  cleanExpired();
}, 5 * 60 * 1000);

/**
 * Save component state to memory cache
 * @param {string} key - Unique component identifier (e.g., 'salesman-details', 'attendance')
 * @param {object} data - The state object to cache
 * @param {number} ttl - Time to live in milliseconds (default: 15 minutes)
 */
export const saveCache = (key, data, ttl = DEFAULT_TTL) => {
  try {
    const serialized = JSON.stringify(data);
    const sizeInBytes = new Blob([serialized]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    // Check if adding this would exceed max total size
    let totalSize = 0;
    sizeTracker.forEach((size) => { totalSize += size; });

    if (totalSize + sizeInMB > MAX_TOTAL_SIZE_MB) {
      console.warn(`[ComponentCache] Cache full (${totalSize.toFixed(1)}MB). Removing oldest entries...`);
      // Remove oldest entries until we have space
      const sortedKeys = [...componentCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (const [oldKey] of sortedKeys) {
        if (totalSize + sizeInMB <= MAX_TOTAL_SIZE_MB) break;
        const oldSize = sizeTracker.get(oldKey) || 0;
        totalSize -= oldSize;
        componentCache.delete(oldKey);
        sizeTracker.delete(oldKey);
      }
    }

    componentCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    sizeTracker.set(key, sizeInMB);

    // Log for development only
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ComponentCache] Saved "${key}" (${sizeInMB.toFixed(2)}MB)`);
    }
  } catch (error) {
    console.error(`[ComponentCache] Failed to cache "${key}":`, error);
  }
};

/**
 * Get cached component state
 * @param {string} key - Unique component identifier
 * @returns {object|null} - Cached data or null if expired/not found
 */
export const getCache = (key) => {
  const cached = componentCache.get(key);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.timestamp > cached.ttl) {
    componentCache.delete(key);
    sizeTracker.delete(key);
    return null;
  }

  // Update timestamp to extend life (LRU-like behavior)
  cached.timestamp = Date.now();

  return cached.data;
};

/**
 * Check if cache exists and is valid
 * @param {string} key - Unique component identifier
 * @returns {boolean}
 */
export const hasCache = (key) => {
  return getCache(key) !== null;
};

/**
 * Clear cache for a specific component or all components
 * @param {string} [key] - Component identifier (if omitted, clears all)
 */
export const clearCache = (key) => {
  if (key) {
    componentCache.delete(key);
    sizeTracker.delete(key);
  } else {
    componentCache.clear();
    sizeTracker.clear();
  }
};

/**
 * Remove all expired entries
 */
export const cleanExpired = () => {
  const now = Date.now();
  let cleanedCount = 0;

  componentCache.forEach((value, key) => {
    if (now - value.timestamp > value.ttl) {
      componentCache.delete(key);
      sizeTracker.delete(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[ComponentCache] Cleaned ${cleanedCount} expired entries`);
  }
};

/**
 * Get cache statistics
 * @returns {object} - Stats about current cache usage
 */
export const getCacheStats = () => {
  let totalSizeMB = 0;
  const entries = [];

  componentCache.forEach((value, key) => {
    const size = sizeTracker.get(key) || 0;
    totalSizeMB += size;
    entries.push({
      key,
      sizeMB: size.toFixed(2),
      age: Math.round((Date.now() - value.timestamp) / 1000) + 's',
      ttl: value.ttl / 1000 + 's',
    });
  });

  return {
    totalEntries: componentCache.size,
    totalSizeMB: totalSizeMB.toFixed(2),
    maxSizeMB: MAX_TOTAL_SIZE_MB,
    usagePercent: ((totalSizeMB / MAX_TOTAL_SIZE_MB) * 100).toFixed(1),
    entries: entries.sort((a, b) => b.sizeMB - a.sizeMB),
  };
};

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  window.__componentCache = {
    getCache,
    saveCache,
    clearCache,
    getStats: getCacheStats,
    hasCache,
  };
}