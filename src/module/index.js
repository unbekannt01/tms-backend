// index.js
const userModule = require("./user/init");
const authModule = require("./auth/init");
const rbacModule = require("./rbac/init");
const taskModule = require("./task/init");
const chatModule = require("./chat/init");
const analyticsModule = require("./analytics/init");

const modules = [
  userModule,
  authModule,
  rbacModule,
  taskModule,
  chatModule,
  analyticsModule,
];

const initializeModules = (app) => {
  modules.forEach((module) => {
    console.log(`Loading module: ${module.name} v${module.version}`);
    app.use("/api", module.routes);
  });
};

module.exports = {
  initializeModules,
  modules,
};