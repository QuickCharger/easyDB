const { BaseRouter } = require('./_base')

class Test extends BaseRouter {

	registerRouter (parent) {
		parent.router.post('/create', async (req, res) => {
			let modelTest = req.DB.orm['test']
			await modelTest.create(req.body)

			if (!req.Model) {
				return this.sendERROR(res, null, 'model null')
			}

			await parent.create(req, res, req.Model)
		})
	}
}

module.exports = new Test().getRouter()
