const { Sequelize, Model, DataTypes, Op, QueryTypes } = require("sequelize")
const { IsArray, IsString } = require("./easy.js")

// 先执行Config， 再执行Run
let config = {
  host: "127.0.0.1",
  port: 3306,
  username: "root",
  password: "123456",
  dbName: "mysql",

  logging: false,
  timezone: "+08:00",
}

class ormEasyDB extends Model {
  async Init () {
    try {
      const result = await sequelize.query(`SHOW TABLES LIKE '${"_EasyDB"}'`)
      if (result[0].length === 0) {
        console.log(`Run 首次运行 初始化 _EasyDB`)
        await ormEasyDB.sync({ force: true })
      }
    } catch (error) {
      console.error(error)
      return false
    }
  }
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
      console.log(`table ${t.TableName}. unknown column type ${col.Type}`)
    }
  }
  return obj
}

// { 'dbname1' : model }
let orm = {}
/**
 * 同步表结构到数据库
 * @param {TableName} t 
 * @param force true强制更新会清空所有数据 false仅同步列，遇到数据不兼容会throw
 * 
 * return
 *   如果同步成功 返回新的model
 *   如果同步失败 返回null
 */
async function syncTable (t, force = false) {
  let tableName = t.TableName
  let obj = columnToSeq(it.Column)
  const model = sequelize.define(tableName, obj)

  try {
    if (force)
      await model.sync({ force: true })
    else
      await model.sync({ alter: true })
    console.log(`table ${tableName} sync success`)
    orm[tableName] = model
    console.log(`orm ${tableName} init finish`)
    return model
  } catch (e) {
    console.log(`table ${t.TableName} sync failed. reason: ${e.message}`)
  }
  return null
}


let sequelize = null
module.exports.Run = async () => {
  sequelize = new Sequelize(config.dbName, config.username, config.password, {
    timezone: config.timezone,
    host: config.host,
    port: config.port,
    dialect: 'mysql',
    logging: config.logging,
    define: {
      // 默认情况下,当未提供表名时,Sequelize 会自动将模型名复数并将其用作表名
      // 使用 freezeTableName: true 停止模型名自动化复数
      freezeTableName: true,
      // 自动向每个模型添加 createdAt 和 updatedAt 字段
      timestamps: true,
      id: 'Id',
      createdAt: 'Creation',
      updatedAt: 'LastModified',
      // 开启软删除 删除后标记deletedAt， timestamps必须启用
      paranoid: true,
    },
  })

  // 尝试连接
  try {
    await sequelize.authenticate()
  } catch (e) {
    console.error(`${e.message}.`)
    return false
  }

  // 内部初始化
  ormEasyDB.init(
    {
      Id: {
        type: DataTypes.INTEGER,
        primaryKey: true, // 设定主键后 默认的id就取消创建
        autoIncrement: true,
      },
      TableName: { type: DataTypes.STRING },
      Column: { type: DataTypes.JSON },
      Log: { type: DataTypes.JSON },
    },
    {
      sequelize,
      modelName: "_EasyDB",
    }
  )
  await new ormEasyDB().Init()

  // 初始化所有ORM
  // 同步所有表结构
  try {
    let tableInfo = await ormEasyDB.findAll()
    if (IsArray(tableInfo)) {
      for (let it of tableInfo) {
        syncTable(it, false)
      }
    }
  } catch (e) {
    console.error(`ORM init failed. ${e.message}`)
    return false
  }

  console.log(`Run finish`)
  return true
}

module.exports.GetORM = (tableName) => {
  return orm[tableName]
}

/**
 * 指定所有表结构
 * 如果之前有表 则删除之前的表 再创建
 * 如果之前没有表 则创建
 * @param {TableName, Column: [{Name, Type}, {Name, Type}]} table
 */
module.exports.Table = async (table) => {
  if (!syncTable(table)) {
    return false
  }
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
  syncTable(table, true)
  return
}

module.exports.TableAddColumn = async (table) => {
  let t = await ormEasyDB.findOne({ where: { TabelName: table.TableName } })
  if (!t) {
    console.error(`table ${table.TableName} not found`)
    return false
  }
  t.Column = [...t.Column, table.Column]
  await t.save()
  initORM(t)
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
