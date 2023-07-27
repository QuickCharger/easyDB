let express = require("express")
const CONSTANT_MESSAGE = require("../lib/constant_message")
const {
  IsBool,
  IsNumber,
  IsNan,
  IsString,
  IsFunction,
  IsArray,
  IsObject,
  IsDefined,
  ToNumber,
  ToString,
} = require("easy")
const db = require("../lib/Database")

class BaseRouter {
  constructor() {
    this.router = express.Router()
    this.CONSTANT_MESSAGE = CONSTANT_MESSAGE
    this.model = null
    this.Op = db.Op

    this.IsBool = IsBool
    this.IsNumber = IsNumber
    this.IsNan = isNaN
    this.IsString = IsString
    this.IsFunction = IsFunction
    this.IsArray = IsArray
    this.IsObject = IsObject
    this.IsDefined = IsDefined
    this.ToNumber = ToNumber
    this.ToString = ToString
  }

  initRet (msg) {
    return {
      data: {},
      code: 0,
      message: msg,
      time: Date.now(),
    }
  }

  sendOK (res, data, msg) {
    res.send({
      code: 0,
      message: msg || CONSTANT_MESSAGE.RESULT.OK,
      data: data || {},
    })
  }

  sendERROR (res, data, msg) {
    res.send({
      code: -1,
      message: msg || CONSTANT_MESSAGE.RESULT.OPERATE_FAILED,
      data: data || {},
    })
  }

  sendForbidden (res, data, msg) {
    res.status(403).send("requesting was forbidden")
  }

  async index (req, res, model) {
    const ret = this.initRet(this.CONSTANT_MESSAGE.RESULT.ADMINISTRATOR_OK)

    let indx = await this.beforeIndexList(req, res)

    let offset = ToNumber(+indx.begin, 0)
    let limit = ToNumber(+indx.count, 999)
    let order = []
    let literal = []

    for (let i = 0; i < indx.filters.length; ++i) {
      let key = indx.filters[i].key
      let exp = indx.filters[i].exp
      let value = indx.filters[i].value

      if (exp == "order") {
        order.push([key, value])
      } else if (
        exp == ">" ||
        exp == "<" ||
        exp == "=" ||
        exp == "!=" ||
        exp == ">=" ||
        exp == "<="
      ) {
        literal.push(`\`${key}\` ${exp} '${value}'`)
      } else if (exp.toLowerCase() === "in" && value.length !== 2) {
        literal.push(`\`${key}\` ${exp} ${value}`)
      }
    }

    if (order.length == 0) order.push(["Id", "DESC"])

    let { count, rows } = await model.findAndCountAll({
      where: model.sequelize.literal(literal.join(" and ")),
      order,
      offset,
      limit,
    })

    rows = JSON.parse(JSON.stringify(rows))
    ret.data.list = await this.afterIndexList(rows)
    ret.data.params = { total: count, begin: offset, count: limit }

    res.send(ret)
  }

  async view (req, res, model) {
    const ret = this.initRet(this.CONSTANT_MESSAGE.RESULT.ADMINISTRATOR_OK)

    let beforeViewRet = await this.beforeView(req, res)
    if (beforeViewRet != null) {
      return res.send(beforeViewRet)
    }

    let row = (await model.findOne({ where: req.body })) || {}
    row = JSON.parse(JSON.stringify(row))
    ret.data = await this.afterView(req, res, row)
    res.send(ret)
  }

  async create (req, res, model) {
    const ret = this.initRet(this.CONSTANT_MESSAGE.RESULT.ADMINISTRATOR_OK)

    if (!req.body.RecordState)
      req.body.RecordState = 1

    let beforeCreateRet = await this.beforeCreate(req, res)
    if (beforeCreateRet != null)
      return res.send(beforeCreateRet)

    let row = await model.create(req.body)
    row = await model.findOne({ where: { Id: row.Id } })
    row = JSON.parse(JSON.stringify(row))
    ret.data = await this.afterCreated(req, res, row)
    res.send(ret)
  }

  async update (req, res, model) {
    const ret = this.initRet(this.CONSTANT_MESSAGE.RESULT.ADMINISTRATOR_OK)

    const oldRow = await model.findByPk(req.body.Id)
    await this.beforeUpdate(req, res, ret, oldRow)

    const operationRow = await model.findByPk(req.body.Id)
    if (operationRow == null) {
      ret.code = 1
      ret.message = this.CONSTANT_MESSAGE.RESULT.ID_NULL
      return res.send(ret)
    }

    Object.entries(req.body).forEach(([key, value]) => {
      operationRow[key] = value
    })
    await operationRow.save()

    let newRow = await model.findByPk(req.body.Id)

    ret.data = newRow
    await this.afterUpdated(req, res, ret, newRow, oldRow)
    res.send(ret)
  }

  async destroy (req, res, model) {
    const ret = this.initRet(this.CONSTANT_MESSAGE.RESULT.ADMINISTRATOR_OK)
    // ret.data.Ids = []
    let cDel = 0
    for (let i = 0; i < req.body.Ids.length; ++i) {
      let v = req.body.Ids[i]
      let oldRow = await model.findByPk(v)
      if (oldRow == null) {
        ret.data[+v] = {
          code: 1,
          message: CONSTANT_MESSAGE.RESULT.DELETE_FAILED,
        }
        continue
      }
      let canDelete = await this.beforeRowDelete(req, res, oldRow)
      if (!canDelete) {
        ret.data[+v] = {
          code: 1,
          message: CONSTANT_MESSAGE.RESULT.DELETE_FAILED,
        }
        continue
      }
      await this.onRowDeleted(req, res, oldRow)
      await oldRow.destroy()
      ret.data[+v] = {
        code: 0,
        message: CONSTANT_MESSAGE.RESULT.OK,
      }
      cDel++
    }
    if (cDel === 0) {
      ret.code = 1
      ret.message = "所有删除失败"
    }
    res.send(ret)
  }

  getRouter (model) {
    try {
      this.model = require(`../orm/${this.__proto__.constructor.name}`)
    } catch (e) {
      this.model = null
    }

    // 注册子类中新增的接口
    this.registerRouter(this)

    // 注册公共路由 重复注册的路由会注册失败
    {
      this.router.post("/index", async (req, res) => {
        if (this.model != null) {
          await this.index(req, res, this.model)
        }
      })
      this.router.post("/view", async (req, res) => {
        if (this.model != null) {
          await this.view(req, res, this.model)
        }
      })
      this.router.post("/create", async (req, res) => {
        if (this.model != null) {
          await this.create(req, res, this.model)
        }
      })
      this.router.post("/update", async (req, res) => {
        if (this.model != null) {
          await this.update(req, res, this.model)
        }
      })
      this.router.post("/destroy", async (req, res) => {
        if (this.model != null) {
          await this.destroy(req, res, this.model)
        }
      })
    }
    return this.router
  }

  // 注册额外接口
  registerRouter (parent) { }

  async beforeIndexList (req, res) {
    let ret = req.body
    ret.filters = ret.filters || []
    return ret
  }
  async afterIndexList (rows) {
    return rows
  }

  async beforeView (req, res) { }
  async afterView (req, res, row) {
    row.Creation = undefined
    row.LastModified = undefined
    row.deletedAt = undefined
    return row
  }

  // 返回object表示出错 需要把obj返回给client
  async beforeCreate (req, res, ret) { }
  async afterCreated (req, res, ret) {
    ret.Creation = undefined
    ret.LastModified = undefined
    ret.deletedAt = undefined
    return ret
  }

  async beforeUpdate (req, res, ret, oldRow) { }
  async afterUpdated (req, res, ret, oldRow) {
    return ret
  }

  // 返回是否能删除
  async beforeRowDelete (req, res, oldRow) {
    return true
  }
  async onRowDeleted (req, res, id, currentRow) { }
}

module.exports = {
  BaseRouter,
}
