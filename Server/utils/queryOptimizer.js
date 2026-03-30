const logger = require("../config/logger");

/**
 * Query optimizer utilities to prevent N+1 queries and improve performance
 */

/**
 * Batch load items by IDs to prevent N+1 queries
 * @param {Array} ids - Array of IDs to load
 * @param {Function} loadFn - Function that loads items by IDs
 * @param {String} keyField - Field name to use as key (default: '_id')
 * @returns {Map} Map of ID to item
 */
async function batchLoad(ids, loadFn, keyField = "_id") {
  if (!ids || ids.length === 0) return new Map();

  const uniqueIds = [...new Set(ids)];
  const items = await loadFn(uniqueIds);
  
  const itemMap = new Map();
  items.forEach(item => {
    const key = item[keyField]?.toString() || item[keyField];
    itemMap.set(key, item);
  });

  return itemMap;
}

/**
 * Create a DataLoader-like batch function
 * @param {Function} batchFn - Function that loads multiple items
 * @returns {Function} Loader function
 */
function createBatchLoader(batchFn) {
  let queue = [];
  let scheduled = false;

  return async function load(key) {
    return new Promise((resolve, reject) => {
      queue.push({ key, resolve, reject });

      if (!scheduled) {
        scheduled = true;
        process.nextTick(async () => {
          const batch = queue;
          queue = [];
          scheduled = false;

          try {
            const keys = batch.map(item => item.key);
            const results = await batchFn(keys);
            
            batch.forEach((item, index) => {
              item.resolve(results[index]);
            });
          } catch (error) {
            batch.forEach(item => item.reject(error));
          }
        });
      }
    });
  };
}

/**
 * Optimize aggregation pipeline by adding indexes hint
 * @param {Array} pipeline - Aggregation pipeline
 * @param {String} indexName - Index to use
 * @returns {Array} Optimized pipeline
 */
function optimizePipeline(pipeline, indexName) {
  if (indexName) {
    return [{ $hint: indexName }, ...pipeline];
  }
  return pipeline;
}

/**
 * Add pagination to aggregation pipeline
 * @param {Array} pipeline - Aggregation pipeline
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @returns {Array} Pipeline with pagination
 */
function addPagination(pipeline, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return [
    ...pipeline,
    { $skip: skip },
    { $limit: limit }
  ];
}

/**
 * Log slow queries for monitoring
 * @param {String} queryName - Name of the query
 * @param {Number} duration - Query duration in ms
 * @param {Object} params - Query parameters
 */
function logSlowQuery(queryName, duration, params = {}) {
  if (duration > 1000) {
    logger.warn({
      message: "Slow query detected",
      queryName,
      duration: `${duration}ms`,
      params,
    });
  }
}

/**
 * Measure query execution time
 * @param {Function} queryFn - Query function to measure
 * @param {String} queryName - Name for logging
 * @returns {Promise} Query result
 */
async function measureQuery(queryFn, queryName) {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    logSlowQuery(queryName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      message: "Query failed",
      queryName,
      duration: `${duration}ms`,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  batchLoad,
  createBatchLoader,
  optimizePipeline,
  addPagination,
  logSlowQuery,
  measureQuery,
};
