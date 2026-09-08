// src/cron/keepAlive.cron.js
// Self-ping cron job to prevent server from sleeping on free-tier cloud platforms.
// Only activates in production (NODE_ENV === "prod").

const cron = require("node-cron");
const http = require("http");
const https = require("https");

const INTERVAL = "*/14 * * * *"; // Every 14 minutes

/**
 * Resolves the backend URL for self-ping.
 * Priority: BACKEND_URL > DEV_LINK (stripped of /api) > localhost fallback
 */
const getBackendUrl = () => {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  if (process.env.DEV_LINK) {
    return process.env.DEV_LINK.replace(/\/api\/?$/, "");
  }
  return `http://localhost:${process.env.PORT || 3001}`;
};

/**
 * Sends an HTTP GET request to the server's own /health endpoint.
 */
const selfPing = () => {
  const backendUrl = `${getBackendUrl()}/health`;
  const client = backendUrl.startsWith("https") ? https : http;

  client
    .get(backendUrl, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(
          `[KeepAlive] ✅ Ping successful (${res.statusCode}) at ${new Date().toISOString()}`
        );
      });
    })
    .on("error", (err) => {
      console.error(`[KeepAlive] ❌ Ping failed: ${err.message}`);
    });
};

// Only activate in production
if (process.env.NODE_ENV === "prod") {
  cron.schedule(INTERVAL, () => {
    selfPing();
  });
  console.log("[KeepAlive] 🔄 Self-ping cron job activated (every 14 minutes)");
} else {
  console.log(
    `[KeepAlive] ⏸️ Self-ping disabled (NODE_ENV=${process.env.NODE_ENV || "undefined"})`
  );
}
