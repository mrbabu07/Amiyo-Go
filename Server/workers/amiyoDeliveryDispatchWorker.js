const { bootstrap } = require("../index");
const { initDeliveryDispatchQueue } = require("../services/deliveryDispatchQueue");

bootstrap({ enableBackgroundJobs: false, enableRealtime: false, startServer: false, exitOnError: true })
  .then(async (app) => {
    const queue = await initDeliveryDispatchQueue(app, { startWorker: true });
    if (!queue) {
      throw new Error("Redis is required to run the Amiyo delivery dispatch worker");
    }
    return queue;
  })
  .then(() => console.info("Amiyo delivery dispatch worker started"))
  .catch((error) => {
    console.error("Amiyo delivery dispatch worker failed to start:", error);
    process.exit(1);
  });
