const { Sequelize, Model, DataTypes, Op, QueryTypes } = require("sequelize")
const { IsArray, IsString } = require("./easy.js")

// 先执行Config， 再执行Run
let config = {
  dialect: 'mysql',
  host: "127.0.0.1",
  port: 3306,
  username: "root",
  password: "123456",
  dbName: "mysql",

  logging: false,
  timezone: "+00:00",
}

async function QueryTables () {
  let ddl = config.dialect === 'mysql' ?
    `SHOW TABLES LIKE '${"_EasyDB"}'`
    : `SELECT name FROM sqlite_master WHERE type='table'`
  let r = await module.exports.sequelize.query(ddl)
  return r[0]
}
class ormEasyDB extends Model {
  async Init () {
    try {
      let tables = await QueryTables()
      if (tables.length === 0) {
        console.log(`Run 首次运行 初始化表 _EasyDB`)
        await ormEasyDB.sync({ force: true })
      }
    } catch (error) {
      console.error(error)
      return false
    }
  }
}

module.exports = { sequelize: null, Op, _innerOrm: ormEasyDB }

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
      console.log(`unknown column type ${col.Type}`)
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
  // // 此方法无序 不好
  // let s = new Set([])
  // for (let k of [...o, ...n])
  //   s.add(k.Name)
  // for (let k of [...n, ...o]) {
  //   if (s.has(k.Name)) {
  //     ret.push(k)
  //     s.delete(k.Name)
  //   }
  // }

  let all = [...o, ...n]

  for (it of all) {
    // 如果在ret中找不到 则push 如果找到则替换
    let idx = ret.findIndex(it2 => it2.Name === it.Name)
    if (idx >= 0)
      ret[idx] = it
    else
      ret.push(it)
  }

  // for (let it of o) {
  //   let find = false
  //   for (let it2 of n) {
  //     if (it.Name === it2.Name) {
  //       let obj = {}
  //       for (let k in it) {
  //         obj[k] = it[k]
  //       }
  //       for (let k in it2) {
  //         obj[k] = it2[k]
  //       }
  //       ret.push(obj)
  //       find = true
  //       break
  //     }
  //   }
  //   if (!find) {
  //     ret.push(it)
  //   }
  // }
  ret = ret.filter((it) => it.Type !== '')
  return ret
}


// { 'dbname1' : model }
let orm = {}
/**
 * 同步表结构到数据库
 * @param {TableName} t 
 * @param force 
 *   true强制更新 删表并创建
 *   false仅同步列，如果表不存在则会创建，遇到数据不兼容会throw
 * 
 * return
 *   如果同步成功 返回新的model
 *   如果同步失败 返回null
 */
async function syncTable (t, force = false) {
  let tableName = t.TableName
  let obj = columnToSeq(t.Column)
  const model = module.exports.sequelize.define(tableName, obj)

  try {
    if (force)
      await model.sync({ force: true })
    else
      await model.sync({ alter: true })
    console.log(`table ${tableName} sync success`)
    orm[tableName] = model
    console.log(`orm ${tableName} init finish`)
    return [true, model]
  } catch (e) {
    console.log(`table ${t.TableName} sync failed. reason: ${e.message}`)
    return [false, e.message]
  }
}


module.exports.Config = (c) => {
  for (let key in c) {
    config[key] = c[key]
  }
}

module.exports.Run = async () => {
  let c = config
  if (config.dialect === 'mysql') {
  } else {
    c.storage = c.sqlite3_storage
    delete c.timezone
  }
  module.exports.sequelize = new Sequelize(config.dbName, config.username, config.password, {
    ...c,
    define: {
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
    },
  })
  // 尝试连接
  try {
    await module.exports.sequelize.authenticate()
  } catch (e) {
    console.error(`${e.message}.`)
    return false
  }
  // 内部初始化
  ormEasyDB.init(
    {
      ...columnToSeq([
        { Name: 'TableName', Type: DataTypes.STRING },
        { Name: 'Column', Type: DataTypes.JSON },
        { Name: 'Log', Type: DataTypes.JSON },
      ])
    },
    {
      sequelize: module.exports.sequelize,
      modelName: "_EasyDB",
    }
  )
  // easyDB内部初始化

  await new ormEasyDB().Init()
  // 同步所有表结构 并初始化orm
  try {
    let tableInfo = await ormEasyDB.findAll()
    if (IsArray(tableInfo)) {
      for (let it of tableInfo) {
        syncTable(it, false)
      }
    }
    console.log(`easyDB Run finish`)
  } catch (e) {
    console.log(e)
  }
  return true
}


module.exports.GetORM = (tableName) => {
  return orm[tableName]
}

// module.exports.ormEasyDB = ormEasyDB


/**
 * 创建表
 * 如果之前有表 则删除之前的表 再创建！！！
 * 如果之前没有表 则创建
 * @param {TableName, Column: [{Name, Type}, {Name, Type}]} table
 */
module.exports.Create = async (table) => {
  // 尝试同步结构
  if (!syncTable(table, true)) {
    return false
  }
  // 存储表结构
  let db = await ormEasyDB.findOne({ where: { TableName: table.TableName } })
  if (db) {
    db.Column = table.Column
    await db.save()
  } else {
    await ormEasyDB.create({
      TableName: table.TableName,
      Column: table.Column,
    })
  }
  return
}

/**
 * 更新表结构，如果数据不兼容可能更新失败！！！
 * @param {TableName, Column:[Name, Type]} table 
 * @returns
 *   null 运行正常 没有错误
 *   string 错误信息
 */
module.exports.Update = async (table) => {
  let tableName = table.TableName
  let t = await ormEasyDB.findOne({ where: { TableName: tableName } })
  if (!t) {
    console.error(`table ${table.TableName} not found`)
    return false
  }
  t.Column = columnMerge(t.Column, table.Column)

  let r = await syncTable(t, false)
  if (r[0] === false) {
    return r[1]
  }
  await t.save()
  return null
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

    // class User extends Model {
    // 	getFullname () {
    // 		return `${this.FirstName} ${asthis.LastName}`
    // 	}
    // }
    // User.init({
    // 	Id: {
    // 		type: DataTypes.INTEGER,
    // 		primaryKey: true,	// 设定主键后 默认的id就取消创建
    // 		autoIncrement: true,
    // 	},
    // 	FirstName: {
    // 		type: DataTypes.STRING,
    // 		// primaryKey: true,
    // 		allowNull: true,		// 建议所有值均允许null 通用性更强
    // 		defaultValue: 'qwer',	// 不建议 默认值建议业务中实现
    // 		unique: true,
    // 	},
    // 	LastName: DataTypes.STRING,
    // }, {
    // 	sequelize,
    // })

    // // 同步表结构
    // // force: true 强制同步 会删除表再创建表
    // try {
    // 	await sequelize.sync({ force: true })
    // } catch (e) {
    // 	console.log(e)
    // }

    // // create
    // {
    // 	const first = await User.create({ FirstName: "first", LastName: "last" }) // = build + save
    // 	console.log(first.getFullname())
    // 	console.log(JSON.stringify(first))
    // }

    // // index
    // {
    // 	let users = await User.findAll({
    // 		order: [['Id', 'DESC']],
    // 		offset: 0,
    // 		limit: 10
    // 	})
    // 	console.log(JSON.stringify(users))
    // }

    // // find
    // {
    // 	let user = await User.findAll({ where: { Id: 1 } })
    // 	console.log(user[0].getFullname())
    // }

    // // update
    // {
    // 	let user = await User.findOne({ where: { Id: 1 } })
    // 	user.FirstName = "ffffffffffffirst"
    // 	await user.save()
    // }

    // // delete
    // {
    // 	let user = await User.findOne({ where: { Id: 1 } })
    // 	await user.destroy()
    // }

    // // 原生sql
    // // https://www.sequelize.cn/core-concepts/raw-queries
    // {
    // 	const users = await sequelize.query("SELECT * FROM `User` ", { type: QueryTypes.SELECT })
    // 	console.log(users)
    // }

    // // where条件 详见 https://www.sequelize.cn/core-concepts/model-querying-basics#%E6%93%8D%E4%BD%9C%E7%AC%A6
    // {
    // 	// const users = await User.findAll({
    // 	// 	where: {
    // 	// 		Id: [1,2,3], // 等同使用 `id: { [Op.in]: [1,2,3] }`

    // 	// 	},

    // 	// 	order: [['Id', 'DESC']],

    // 	// 	offset: 0,
    // 	// 	limit: 10
    // 	// });
    // 	// console.log(JSON.stringify(users))
    // }
  }, 100)
}
