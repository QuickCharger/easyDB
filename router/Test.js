const { BaseRouter } = require('./_base')

class Test extends BaseRouter {

	registerRouter (parent) {
		parent.router.post('/create', async (req, res) => {
			// let model = req.Model
			let modelTest = req.DB.orm['test']
			await modelTest.create(req.body)

			const ret = parent.initRet(this.CONSTANT_MESSAGE.RESULT.ADMINISTRATOR_OK)
			res.send(ret)
		})
	}
}

module.exports = new Test().getRouter()
