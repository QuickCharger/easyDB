const { BaseRouter } = require("./_base")
const db = require("../lib/easy/Database")

class Router extends BaseRouter {
  registerRouter (parent) {
    this.router.post("*", async (req, res) => {
      let path = req.originalUrl.split("/")
      if (path.length < 3) {
        parent.sendERROR(res, null, "invalid path")
      }
      let module = path[1]
      let func = path[2]
      if (
        ["index", "view", "create", "update", "destroy"].indexOf(func) === -1
      ) {
        parent.sendERROR(res, null, "invalid function")
      }

      let orm = db.GetORM(module)
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
