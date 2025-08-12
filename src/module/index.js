const userModule = require("./user/init")
const bookModule = require("./book/init")
const authModule = require("./auth/init")
const rbacModule = require("./rbac/init")
const taskModule = require("./task/init")

const modules = [userModule, bookModule, authModule, rbacModule, taskModule]

const initializeModules = (app) => {
  modules.forEach((module) => {
    console.log(`Loading module: ${module.name} v${module.version}`)
    app.use("/api", module.routes)
  })
}

module.exports = {
  initializeModules,
  modules,
}
