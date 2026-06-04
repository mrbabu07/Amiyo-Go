const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const emailService = require("./emailService");

const hasRedis = () =>
  process.env.REDIS_ENABLED !== "false" &&
  (process.env.REDIS_URL || process.env.EMAIL_QUEUE_USE_REDIS === "true");

let queue = null;
let worker = null;

const getConnection = () => {
  if (process.env.REDIS_URL) return new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  return new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
};

function initEmailQueue() {
  if (!hasRedis()) {
    return { enabled: false, mode: "direct" };
  }

  if (!queue) {
    const connection = getConnection();
    queue = new Queue("email-delivery", { connection });
    worker = new Worker(
      "email-delivery",
      async (job) => {
        if (job.data.templateName) {
          return emailService.sendTemplate(job.data.templateName, job.data.to, job.data.data || {});
        }
        return emailService.sendEmail(job.data);
      },
      {
        connection,
        concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY || 3),
      },
    );

    worker.on("failed", (job, error) => {
      console.error("Email queue job failed:", job?.id, error.message);
    });
  }

  return { enabled: true, mode: "bullmq" };
}

async function enqueueEmail(payload = {}) {
  if (!hasRedis()) {
    if (payload.templateName) {
      return emailService.sendTemplate(payload.templateName, payload.to, payload.data || {});
    }
    return emailService.sendEmail(payload);
  }

  initEmailQueue();
  const job = await queue.add("send-email", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  });

  return { success: true, queued: true, jobId: job.id };
}

module.exports = {
  enqueueEmail,
  initEmailQueue,
};
