const cron = require("node-cron");
const CampaignSchedulerService = require("../services/CampaignSchedulerService");

class CampaignScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all scheduler jobs
   */
  initializeJobs() {
    console.log("Initializing campaign scheduler jobs...");

    // Run every minute: Process scheduled and expired campaigns
    this.addJob("* * * * *", async () => {
      console.log("[Campaign Scheduler] Running minute tasks...");
      await CampaignSchedulerService.processScheduledCampaigns();
      await CampaignSchedulerService.processExpiredCampaigns();
    });

    // Run every 5 minutes: Aggregate analytics
    this.addJob("*/5 * * * *", async () => {
      console.log("[Campaign Scheduler] Running analytics aggregation...");
      await CampaignSchedulerService.aggregateAnalytics();
    });

    // Run every 30 minutes: Check performance thresholds
    this.addJob("*/30 * * * *", async () => {
      console.log("[Campaign Scheduler] Checking performance thresholds...");
      await CampaignSchedulerService.checkPerformanceThresholds();
    });

    // Run every 10 minutes: Send notifications
    this.addJob("*/10 * * * *", async () => {
      console.log("[Campaign Scheduler] Sending notifications...");
      await CampaignSchedulerService.sendNotifications();
    });

    // Run every hour: Check campaigns ending soon
    this.addJob("0 * * * *", async () => {
      console.log("[Campaign Scheduler] Checking campaigns ending soon...");
      await CampaignSchedulerService.checkCampaignsEndingSoon();
    });

    // Run every 6 hours: Check zero view campaigns
    this.addJob("0 */6 * * *", async () => {
      console.log("[Campaign Scheduler] Checking zero view campaigns...");
      await CampaignSchedulerService.checkZeroViewCampaigns();
    });

    console.log("Campaign scheduler jobs initialized successfully");
  }

  /**
   * Add a cron job
   */
  addJob(schedule, task) {
    try {
      const job = cron.schedule(schedule, task, {
        scheduled: false,
      });

      job.start();
      this.jobs.push(job);
      console.log(`Added cron job with schedule: ${schedule}`);
    } catch (error) {
      console.error(`Failed to add cron job: ${error.message}`);
    }
  }

  /**
   * Stop all jobs
   */
  stopAllJobs() {
    console.log("Stopping all campaign scheduler jobs...");
    this.jobs.forEach(job => {
      job.stop();
    });
    this.jobs = [];
    console.log("All campaign scheduler jobs stopped");
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      totalJobs: this.jobs.length,
      jobs: this.jobs.map((job, index) => ({
        id: index,
        status: job._destroyed ? "stopped" : "running",
      })),
    };
  }
}

module.exports = new CampaignScheduler();
