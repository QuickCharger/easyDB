const path = require('path')
const { Sequelize, Model, DataTypes, Op, QueryTypes } = require("sequelize")
// const { IsArray, IsString } = require("easy")

let ormEasyDB = null
let _config = {}

const _config_sequelize = {
  // 默认情况下,当未提供表名时,Sequelize 会自动将模型名复数并将其用作表名
  // 使用 freezeTableName: true 停止模型名自动化复数
  freezeTableName: true,
  // 自动向每个模型添加 createdAt 和 updatedAt 字段
  timestamps: true,
  id: 'Id',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  // 开启软删除 删除后标记deletedAt， timestamps必须启用
  paranoid: true,
}

function columnToSeq (column) {
  let obj = {}
  obj['Id'] = {
    type: DataTypes.INTEGER,
    primaryKey: true, // 设定主键后 默认的id就取消创建
    autoIncrement: true,
  }
  for (let col of column) {
    if (col.Name === 'Id')
      continue
    if (col.Type === "int")
      obj[col.Name] = { type: DataTypes.INTEGER }
    else if (col.Type === "number")
      obj[col.Name] = { type: DataTypes.FLOAT }
    else if (col.Type === "string")
      obj[col.Name] = { type: DataTypes.STRING }
    else if (col.Type === "json")
      obj[col.Name] = { type: DataTypes.JSON }
    else {
      obj[col.Name] = { type: DataTypes.STRING }
      console.warn(`unknown column type ${col.Type}`)
    }
  }
  return obj
}


/**
 * 如果Type==='' 表示要删除此值
 * @param {*} o 
 * @param {*} n 
 * @returns 
 */
function columnMerge (o, n) {
  let ret = []
  let all = [...o, ...n]

  for (it of all) {
    // 如果在ret中找不到 则push 如果找到则替换
    let idx = ret.findIndex(it2 => it2.Name === it.Name)
    if (idx >= 0)
      ret[idx] = it
    else
      ret.push(it)
  }

  ret = ret.filter((it) => it.Type !== '')
  return ret
}


/**
 * 同步数据库到EasyDB
 * @param db  
 */
async function syncDB (dbName) {
  let db = module.exports.GetDB(dbName)
  return db ? db : await new _DB().Init({
    ..._config,
    dbName,
  })
}


class _DB {
  constructor() {
    this.config = {}
    this.sequelize = null
    this.orm = {}   // {'tableName':orm}
  }

  async Init (config) {
    this.config = config
    // fix storage. sqlite only
    if (this.config.dialect === 'sqlite') {
      this.config.storage = path.join(this.config.storage_path, `${this.config.dbName}.db`)
    }
    this.sequelize = new Sequelize(this.config)

    // 尝试连接
    try {
      await this.sequelize.authenticate()
      console.log(`${this.sequelize.options.dbName} auth success`)
    } catch (e) {
      console.error(`${e.message}.`)
      this.sequelize = null
      return null
    }

    module.exports.DB[this.config.dbName] = this

    return this
  }

  async QueryTables (tableName) {
    let ddl = this.config.dialect === 'mysql' ?
      `SHOW TABLES LIKE '${tableName}'`
      : `SELECT name FROM sqlite_master WHERE type='table'`
    let r = await this.sequelize.query(ddl)

    let t = r[0].find(it => it.name === tableName)
    return t !== undefined
  }

  /**
   * 同步表结构到数据库
   * @param {TableName, Columns} t 
   * @param force 
   *   true强制更新 删表并创建
   *   false仅同步列，如果表不存在则会创建，遇到数据不兼容会throw
   * 
   * return
   *   如果同步成功 返回新的model
   *   如果同步失败 返回null
   */
  async syncTable ({ TableName, Columns }, force = false) {
    Columns = columnToSeq(Columns)
    const model = this.sequelize.define(TableName, Columns, _config_sequelize)

    try {
      await model.sync(force ? { force: true } : { alter: true })
      console.log(`${this.sequelize.options.dbName}.${TableName} sync success`)
      this.orm[TableName] = model
      // console.log(`model ${TableName} init finish`)
      return model
    } catch (e) {
      let msg = `Table ${TableName} sync failed. reason: ${e.message}`
      console.error(msg)
      throw msg
    }
  }
}

module.exports.DB = {}

module.exports.Run = async (config) => {
  _config = JSON.parse(JSON.stringify(config))
  // 初始化EasyDB
  {
    let db = await new _DB().Init({
      dialect: 'sqlite',
      dbName: 'EasyDB',
      storage_path: _config.storage_path,
      // logging: console.log,
      logging: false,
    })

    // 初始化EasyDB表
    // 内部表名为_开头 因为EasyDB可能作为用户数据库来使用， 加上_用以和用户数据区分
    ormEasyDB = await db.syncTable({
      TableName: '_EasyDB', Columns: [
        { Name: 'DBName', Type: 'string' },
        { Name: 'TableName', Type: 'string' },
        { Name: 'Columns', Type: 'json' },
      ]
    })
    module.exports.ormEasyDB = ormEasyDB
  }

  // 同步所有数据库，表结构 并初始化orm
  try {
    let dbs = await ormEasyDB.findAll()
    for (let { Id, DBName, TableName, Columns } of dbs) {
      let db = module.exports.GetDB(DBName)
      if (!db) {
        db = await new _DB().Init({
          ..._config,
          dbName: DBName,
        })
      }
      await db.syncTable({ TableName, Columns }, false)
    }
  } catch (e) {
    console.log(e)
  }
  return true
}

module.exports.GetDB = (dbName) => {
  return module.exports.DB[dbName]
}

module.exports.GetORM = (tableName, dbName = 'EasyDB') => {
  let db = module.exports.GetDB(dbName)
  return db ? db.orm[tableName] : null
}


/**
 * 创建 数据库 或 创建表
 * 默认操作EasyDB
 * 如果之前没有数据库 则创建
 * 如果之前有表 则删除之前的表 再创建！！！
 * 如果之前没有表 则创建
 * @param {TableName, Columns: [{Name, Type}, {Name, Type}]} table
 */
module.exports.Create = async ({ Table: { TableName, Columns }, DBName }) => {
  try {
    DBName = DBName || 'EasyDB'
    // 尝试同步结构
    let db = await syncDB(DBName)
    await db.syncTable({ TableName, Columns }, true)
  } catch (e) {
    console.log(e)
    return false
  }
  // 存储表结构
  let easyDB = await ormEasyDB.findOne({
    where: {
      DBName,
      TableName
    }
  })
  if (easyDB) {
    easyDB.Columns = Columns
    await easyDB.save()
  } else {
    await ormEasyDB.create({
      DBName,
      TableName,
      Columns,
    })
  }
  return true
}


/**
 * 更新表结构，如果数据不兼容可能更新失败！！！
 * 假设数据库和表都已经存在， 如果不存在 则应该先create
 * @param {{TableName, Columns:[Name, Type]}, DBName} table 
 * @returns
 *   null 运行正常 没有错误
 *   string 错误信息
 */
module.exports.Update = async ({ Table: { TableName, Columns }, DBName }) => {
  try {
    DBName = DBName || 'EasyDB'
    let db = module.exports.GetDB(DBName)
    if (!db)
      return `cannot find DB ${DBName}`
    let table = await ormEasyDB.findOne({ where: { DBName, TableName } })
    if (!table)
      return `cannot find Table ${TableName}`
    await db.syncTable({ TableName, Columns })
    table.Columns = Columns
    await table.save()
    return true
  } catch (e) {
    return e.message
  }
  return ''
}


/**
 * 更新表结构，如果数据不兼容可能更新失败！！！
 * @param {TableName, Column:[Name, Type]} table 
 * @returns
 *   [true|false, errMsg]
 */
module.exports.Destroy = async (table) => {
  let tableName = table.TableName
  let t = await ormEasyDB.findOne({ where: { TableName: tableName } })
  if (!t) {
    console.error(`table ${table.TableName} not found`)
    return [false, `table ${table.TableName} not found`]
  }
  await t.destroy()

  await orm[tableName].drop()
  delete orm[tableName]
  return [true, '']
}


if (require.main === module) {
  setTimeout(async () => {
    module.exports.Config({ dbName: "mysql", username: "root" })
    await module.exports.Run()
  }, 100)
}
