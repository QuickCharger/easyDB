let express = require("express")
let bodyParser = require("body-parser")
let cors = require("cors")
let Config = require('./config')
const DB = require("./lib/Database")

let app = express()
app.use(cors())
app.use(bodyParser.json({ limit: "1MB" }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use(async (req, res, next) => {
  console.log(``)
  console.log(`request for ${req.originalUrl}. now ${new Date().toLocaleString()}`)
  console.log(`user: ${JSON.stringify(req.user)}`)
  console.log(`body: ${JSON.stringify(req.body)}`)
  next()
})

const path = require('path')
app.use(express.static(path.join(__dirname, 'public')))
app.use('/_easydb', require('./router/_easydb'))

// fill req.DB
// fill req.Model
app.use(async (req, res, next) => {
  let path = req.originalUrl.split("/")
  if (path.length < 3) {
    return res.send({
      code: -1,
      message: "invalid path",
      data: data || {},
    })
  }
  let module = path[path.length - 2] // TableName
  let func = path[path.length - 1]  // index, view, create, update, destroy
  req.DB = DB.GetDB(req.headers.dbname)
  if (!req.DB) {
    return res.send({
      code: -1,
      message: "invalid DB",
      data: data || {},
    })
  }
  req.Model = DB.GetORM(module, req.headers.dbname)
  next()
})
// demo
app.use('/test', require('./router/Test'))

// 通用处理 放在最后
app.use('*', require('./router/_router'))

// error handler
app.use(function (err, req, res, next) {
  res.send({ result: -1, message: "error" })
})

app.listen(Config.listen, () => {
  console.log("run")
})

process.on('uncaughtException', (err) => {
  console.error(err)
})

setTimeout(async () => {
  let db = require("./lib/Database")
  await db.Run(Config.sql_config)

  // 打开管理后台
  // require('child_process').exec(`start http://127.0.0.1:3000`)
}, 100)

module.exports = app
