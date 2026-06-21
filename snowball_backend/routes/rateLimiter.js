// rateLimiter.js
const rateLimits = new Map();

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // max requests per windowMs per IP
  const message = options.message || 'Too many requests, please try again later.';

  // Clean up old entries every windowMs
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimits.entries()) {
      if (now - record.startTime > windowMs) {
        rateLimits.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, { startTime: now, count: 1 });
      return next();
    }

    const record = rateLimits.get(ip);
    if (now - record.startTime > windowMs) {
      // Window expired, reset
      rateLimits.set(ip, { startTime: now, count: 1 });
      return next();
    }

    if (record.count >= max) {
      return res.status(429).json({
        status: false,
        message: message
      });
    }

    record.count++;
    next();
  };
}

module.exports = rateLimiter;