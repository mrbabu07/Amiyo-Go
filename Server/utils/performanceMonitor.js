const logger = require("../config/logger");

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      slowQueries: [],
    };
  }

  // Middleware to track request performance
  trackRequest() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track response
      res.on("finish", () => {
        const duration = Date.now() - startTime;
        this.metrics.requests++;
        this.metrics.totalResponseTime += duration;

        // Log slow requests
        if (duration > 1000) {
          logger.warn({
            message: "Slow request detected",
            url: req.originalUrl,
            method: req.method,
            duration: `${duration}ms`,
          });
        }

        // Track errors
        if (res.statusCode >= 400) {
          this.metrics.errors++;
        }
      });

      next();
    };
  }

  // Get current metrics
  getMetrics() {
    const avgResponseTime = this.metrics.requests > 0
      ? Math.round(this.metrics.totalResponseTime / this.metrics.requests)
      : 0;

    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.requests > 0
        ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2) + "%"
        : "0%",
      avgResponseTime: `${avgResponseTime}ms`,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      slowQueries: [],
    };
  }
}

module.exports = new PerformanceMonitor();
