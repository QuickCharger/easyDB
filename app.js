let express = require("express")
let bodyParser = require("body-parser")
let cors = require("cors")
let Config = require('./config')

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

app.use("/_easydb", require("./router/_easydb"))
app.use("*", require("./router/_router"))

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
}, 100)

module.exports = app
