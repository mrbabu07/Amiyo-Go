const express = require("express");
const { getServiceConfigStatus } = require("../config/env");
const { isRedisAvailable } = require("../config/redis");

const router = express.Router();

const readyStateLabel = (state) => ({
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
}[state] || "unknown");

async function pingMongo(app) {
  if (!app.locals.db) {
    return {
      ok: false,
      status: "missing",
      message: "MongoDB database handle is not attached.",
    };
  }

  try {
    await app.locals.db.command({ ping: 1 });
    return {
      ok: true,
      status: "connected",
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      message: error.message,
    };
  }
}

async function buildReadiness(app) {
  const config = getServiceConfigStatus(process.env);
  const mongo = await pingMongo(app);
  const mongooseState = app.locals.mongoose?.connection?.readyState;
  const mongoose = {
    ok: mongooseState === 1,
    status: readyStateLabel(mongooseState),
  };
  const firebase = {
    ok: config.firebase.configured,
    status: config.firebase.status,
  };
  const redis = {
    ok: config.redis.disabled || !config.redis.required || isRedisAvailable(),
    status: config.redis.disabled ? "disabled" : isRedisAvailable() ? "connected" : "optional_unavailable",
    required: config.redis.required,
  };
  const supabase = {
    ok: config.supabase.configured || !config.supabase.required,
    status: config.supabase.configured ? "configured" : "local_upload_fallback",
    required: config.supabase.required,
  };
  const email = {
    ok: config.email.configured || !config.email.required,
    status: config.email.configured ? "smtp_configured" : "mock_mode",
    required: config.email.required,
  };
  const push = {
    ok: config.push.configured || !config.push.required,
    status: config.push.configured ? "vapid_configured" : "limited",
    required: config.push.required,
  };
  const jobState = app.locals.jobs || {};
  const jobsDisabled = jobState.mode === "serverless" || jobState.mode === "disabled";
  const jobs = {
    ok: jobsDisabled || Boolean(jobState.campaignScheduler && jobState.analyticsSummary && jobState.newsletterBroadcasts),
    status: jobsDisabled ? jobState.mode : jobState,
  };

  const checks = {
    mongo,
    mongoose,
    firebase,
    redis,
    supabase,
    email,
    push,
    jobs,
  };

  return {
    ok: mongo.ok && mongoose.ok && firebase.ok && redis.ok && supabase.ok && email.ok && push.ok && jobs.ok,
    checks,
  };
}

router.get(["/health", "/api/health"], (req, res) => {
  res.json({
    ok: true,
    status: "live",
    service: "amiyo-go-api",
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: req.app.locals.boot?.startedAt,
  });
});

router.get(["/ready", "/api/ready"], async (req, res) => {
  const readiness = await buildReadiness(req.app);
  res.status(readiness.ok ? 200 : 503).json({
    ok: readiness.ok,
    status: readiness.ok ? "ready" : "not_ready",
    ...readiness,
  });
});

router.get(["/ops", "/api/ops"], async (req, res) => {
  const readiness = await buildReadiness(req.app);

  res.status(readiness.ok ? 200 : 503).json({
    ok: readiness.ok,
    status: readiness.ok ? "operational" : "degraded",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: req.app.locals.boot?.startedAt,
    database: {
      name: req.app.locals.db?.databaseName || null,
      mongo: readiness.checks.mongo.status,
      mongoose: readiness.checks.mongoose.status,
    },
    services: readiness.checks,
    config: getServiceConfigStatus(process.env),
  });
});

module.exports = {
  buildReadiness,
  router,
};
