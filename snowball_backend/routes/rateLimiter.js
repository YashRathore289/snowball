// rateLimiter.js
const rateLimits = new Map();

// Different limits for different endpoint types
const PRIORITY = {
  CRITICAL: 'critical',   // Insert, Update, Delete operations
  HIGH: 'high',           // Single entity lookups
  LOW: 'low'              // Bulk retrievals, list fetches
};

const DEFAULT_LIMITS = {
  [PRIORITY.CRITICAL]: { windowMs: 1 * 60 * 1000, max: 100 },    // 50 critical ops per minute
  [PRIORITY.HIGH]: { windowMs: 1 * 60 * 1000, max: 60 },         // 30 single lookups per minute
  [PRIORITY.LOW]: { windowMs: 1 * 60 * 1000, max: 30 }           // 15 bulk retrievals per minute
};

function rateLimiter(options = {}) {
  const priority = options.priority || PRIORITY.LOW;
  const limits = DEFAULT_LIMITS[priority];
  const windowMs = options.windowMs || limits.windowMs;
  const max = options.max || limits.max;
  const message = options.message || `Too many ${priority} requests, please wait.`;

  // Clean up old entries every minute
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, records] of rateLimits.entries()) {
      // Clean each priority's records
      for (const p of Object.values(PRIORITY)) {
        if (records[p] && now - records[p].startTime > DEFAULT_LIMITS[p].windowMs) {
          delete records[p];
        }
      }
      // Remove IP entry if all priorities are cleaned
      if (Object.keys(records).length === 0) {
        rateLimits.delete(key);
      }
    }
  }, 60 * 1000);

  // Prevent memory leak by allowing cleanup interval to be cleared
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, {});
    }

    const records = rateLimits.get(ip);

    if (!records[priority]) {
      records[priority] = { startTime: now, count: 1 };
      return next();
    }

    const record = records[priority];

    // Reset if window expired
    if (now - record.startTime > windowMs) {
      records[priority] = { startTime: now, count: 1 };
      return next();
    }

    // Check limit
    if (record.count >= max) {
      return res.status(429).json({
        status: false,
        message: message,
        retryAfter: Math.ceil((record.startTime + windowMs - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}

// Helper functions for different priority levels
rateLimiter.critical = function(options = {}) {
  return rateLimiter({ ...options, priority: PRIORITY.CRITICAL });
};

rateLimiter.high = function(options = {}) {
  return rateLimiter({ ...options, priority: PRIORITY.HIGH });
};

rateLimiter.low = function(options = {}) {
  return rateLimiter({ ...options, priority: PRIORITY.LOW });
};

// Export priorities for use in routes
rateLimiter.PRIORITY = PRIORITY;

module.exports = rateLimiter;