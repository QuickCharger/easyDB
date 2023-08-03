const { BaseRouter } = require('./_base')
const db = require('../lib/Database')
const easy = require('easy')

class Table extends BaseRouter {

  async beforeCreate (req, res, ret) {
    if (!easy.IsArray(req.body.Column)) {
      req.body.Column = []
    }
  }

  registerRouter (parent) {
    this.router.post("/index", async (req, res) => {
      await parent.index(req, res, db.ormEasyDB)
    })

    this.router.post("/view", async (req, res) => {
      await parent.view(req, res, db.ormEasyDB)
    })

    this.router.post("/create", async (req, res) => {
      if (!easy.IsString(req.body.TableName) || req.body.TableName.length === 0) {
        return parent.sendERROR(res)
      }
      parent.beforeCreate(req, res)
      let { DBName, TableName, Columns } = req.body
      Columns = Columns || []
      await db.Create({
        Table: {
          TableName,
          Columns,
        },
        DBName
      })
      parent.sendOK(res)
    })

    this.router.post("/update", async (req, res) => {
      let { DBName, TableName, Columns } = req.body
      if (!easy.IsString(TableName)) {
        return parent.sendERROR(res)
      }
      if (!easy.IsArray(Columns)) {
        return parent.sendERROR(res)
      }
      await db.Update({
        Table: {
          TableName,
          Columns,
        },
        DBName
      })
      parent.sendOK(res)
    })

    this.router.post("/destroy", async (req, res) => {
      let { DBName, TableName } = req.body
      if (!easy.IsString(TableName)) {
        return parent.sendERROR(res)
      }
      await db.Destroy({
        Table: {
          TableName,
        },
        DBName
      })
      parent.sendOK(res)
    })

    this.router.post('/brief', async (req, res) => {
      let orm = db.ormEasyDB
      let tables = await orm.findAll()
      parent.sendOK(res, {
        Tables: tables
      })
    })

    this.router.post("*", async (req, res) => {
      res.send({ result: -1, message: "接口未开放" })
    })
  }
}

module.exports = new Table().getRouter()
