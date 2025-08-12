const userModule = require("./user/init")
const bookModule = require("./book/init")
const authModule = require("./auth/init")

const modules = [userModule, bookModule, authModule]

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
