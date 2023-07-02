const { BaseRouter } = require("./_base")
const db = require("../lib/easy/Database")
const easy = require("../lib/easy/easy")

class Table extends BaseRouter {
  registerRouter (parent) {
    this.router.post("/index", async (req, res) => {
      await parent.index(req, res, db.ormEasyDB)
    })

    this.router.post("/view", async (req, res) => {
      await parent.view(req, res, db.ormEasyDB)
    })

    this.router.post("/create", async (req, res) => {
      if (!easy.IsString(req.body.TableName)) {
        return parent.sendERROR(res)
      }
      if (!easy.IsArray) {
        return parent.sendERROR(req.body.Column)
      }
      await db.Create(req.body)
      parent.sendOK(res)
    })

    this.router.post("/update", async (req, res) => {
      if (!easy.IsString(req.body.TableName)) {
        return parent.sendERROR(res)
      }
      if (!easy.IsArray) {
        return parent.sendERROR(req.body.Column)
      }
      let r = await db.Update(req.body)
      if (r)
        parent.sendERROR(res, null, r)
      else
        parent.sendOK(res)
    })

    this.router.post("/destroy", async (req, res) => {
      if (!easy.IsString(req.body.TableName)) {
        return parent.sendERROR(res)
      }
      let r = await db.Destroy(req.body)
      if (r[0] === true)
        parent.sendOK(res)
      else
        parent.sendERROR(res, null, r[1])
    })

    this.router.post("*", async (req, res) => {
      res.send({ result: -1, message: "接口未开放" })
    })
  }
}

module.exports = new Table().getRouter()
