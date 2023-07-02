const { BaseRouter } = require("./_base");
const db = require("../lib/easy/Database");
const easy = require("../lib/easy/easy");

class Table extends BaseRouter {
  registerRouter(parent) {
    const retErr = { result: -1, message: "接口未开放" };
    this.router.post("/index", async (req, res) => {
      res.send(retErr);
    });
    this.router.post("/view", async (req, res) => {
      res.send(retErr);
    });
    this.router.post("/create", async (req, res) => {
      if (!easy.IsString(req.body.TableName)) {
        return parent.sendERROR(res);
      }
      if (!easy.IsArray) {
        return parent.sendERROR(req.body.Column);
      }
      await db.Table(req.body);
      parent.sendOK(res);
    });
    this.router.post("/update", async (req, res) => {
      res.send(retErr);
    });
    this.router.post("/destroy", async (req, res) => {
      res.send(retErr);
    });
  }
}

module.exports = new Table().getRouter();
