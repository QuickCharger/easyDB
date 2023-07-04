let express = require("express")
let bodyParser = require("body-parser")
let cors = require("cors")

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

let fs = require('fs')
app.use(async (req, res, next) => {
  if (req.originalUrl === '/') {
    let c = fs.readFileSync('./index.html')
    res.send(c.toString())
    return
  }
  next()
})

app.use("/_easydb", require("./router/_easydb"))
app.use("*", require("./router/_router"))

// error handler
app.use(function (err, req, res, next) {
  res.send({ result: -1, message: "error" })
})

app.listen(3000, () => {
  console.log("run")
})

setTimeout(async () => {
  let db = require("./lib/easy/Database")
  db.Config({ dbName: "EasyDB" })
  let r = await db.Run()
  let c = r
}, 100)

module.exports = app
