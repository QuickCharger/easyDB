const { BaseRouter } = require("./_base")
const db = require("../lib/Database")

class Router extends BaseRouter {
  registerRouter (parent) {
    this.router.post("*", async (req, res) => {
      let path = req.originalUrl.split("/")
      if (path.length < 3) {
        return parent.sendERROR(res, null, "invalid path")
      }
      let module = path[path.length - 2]
      let func = path[path.length - 1]
      if (
        ["index", "view", "create", "update", "destroy"].indexOf(func) === -1
      ) {
        return parent.sendERROR(res, null, "invalid function")
      }

      let orm = db.GetORM(module, req.headers.dbname)
      if (!orm) {
        return parent.sendERROR(res, null, "invalid module")
      }

      if (func === "index") {
        await parent.index(req, res, orm)
      } else if (func === "view") {
        await parent.view(req, res, orm)
      } else if (func === "create") {
        await parent.create(req, res, orm)
      } else if (func === "update") {
        await parent.update(req, res, orm)
      } else if (func === "destroy") {
        await parent.destroy(req, res, orm)
      }
    })
  }
}

module.exports = new Router().getRouter()
