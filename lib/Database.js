const path = require('path')
const { Sequelize, Model, DataTypes, Op, QueryTypes } = require("sequelize")
// const { IsArray, IsString } = require("easy")
/**
 * sequelize的连接需要指定数据库, 此处特殊处理, 用于创建数据库
*/
const mysql2 = require('mysql2/promise')
let _mysql = null

let ormEasyDB = null
let _config_internal = {
  dialect: 'sqlite',
  dbName: '_easyDB',
  storage_path: path.join(__dirname, `..`, `db`),
  // logging: console.log,
  logging: false,
}

let _config_user = {}


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
async function syncDB ({ dbName, ...other }) {
  let db = module.exports.GetDB(dbName)
  return db ? db : await new _DB().Init({
    dbName,
    ...other,
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
    } else if (this.config.dialect === 'mysql') {
      await _mysql.query(`CREATE DATABASE IF NOT EXISTS ${this.config.dbName}`)
      this.config = {
        ...this.config,
        database: this.config.dbName,
      }
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
    await this.sequelize.query(`DROP TABLE IF EXISTS ${TableName}_backup;`)

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
  _config_user = JSON.parse(JSON.stringify(config))
  // 初始化EasyDB
  {
    let db = await syncDB(_config_internal)

    // 初始化EasyDB表
    ormEasyDB = await db.syncTable({
      TableName: '_EasyDB', Columns: [
        { Name: 'DBName', Type: 'string' },
        { Name: 'TableName', Type: 'string' },
        { Name: 'Columns', Type: 'json' },
      ]
    })

    if (_config_user.dialect === 'mysql') {
      _mysql = await mysql2.createConnection({
        host: _config_user.host,
        user: _config_user.username,
        password: _config_user.password
      })
      // await _mysql.connect()
    }

    // 初始化用户数据
    // await module.exports.Create({
    //   DBName: 'User',
    //   Table: {
    //     TableName: 'Test', Columns: [
    //       { Name: 'column_int', Type: 'int' },
    //       { Name: 'column_string', Type: 'string' },
    //     ]
    //   },
    // })
    module.exports.ormEasyDB = ormEasyDB
  }

  // 同步所有数据库，表结构 并初始化orm
  try {
    let dbs = await ormEasyDB.findAll()
    for (let { Id, DBName, TableName, Columns } of dbs) {
      let db = module.exports.GetDB(DBName)
      if (!db) {
        db = await new _DB().Init({
          ..._config_user,
          dbName: DBName,
        })
      }
      await syncDB({ ..._config_user, dbName: DBName })
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

module.exports.GetORM = (tableName, dbName) => {
  dbName = dbName || '_easyDB'
  let db = module.exports.GetDB(dbName)
  return db ? db.orm[tableName] : null
}


/**
 * 创建 数据库 或 创建表
 * 如果之前没有数据库则创建 如果有数据库则跳过
 * 如果之前没有表则创建 如果有表则跳过
 * @param {TableName, Columns: [{Name, Type}, {Name, Type}]} table
 */
module.exports.Create = async ({ Table: { TableName, Columns }, DBName }) => {
  try {
    DBName = DBName || 'User'
    // 尝试同步结构
    console.log(_config_user)
    let db = await syncDB({ ..._config_user, dbName: DBName })
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
    DBName = DBName || '_easyDB'
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
 * 删除表！！！
 * @param {TableName, Column:[Name, Type]} table 
 * @returns
 *   [true|false, errMsg]
 */
module.exports.Destroy = async ({ Table: { TableName }, DBName }) => {
  try {
    DBName = DBName || '_easyDB'
    let db = module.exports.GetDB(DBName)
    if (!db)
      return `cannot find DB ${DBName}`

    let table = await ormEasyDB.findOne({ where: { DBName, TableName } })
    if (!table)
      return `cannot find Table ${TableName}`
    await table.destroy()
    await db.orm[TableName].drop()
    delete db.orm[TableName]
    return true
  } catch (e) {
    return e.message
  }
}


if (require.main === module) {
  setTimeout(async () => {
    module.exports.Config({ dbName: "mysql", username: "root" })
    await module.exports.Run()
  }, 100)
}
