let http = require('http')
let querystring = require('qs')

let remote = false

function init (a_path, a_contentLength, a_remote = null) {
    let ret = {
        port: 3000,
        path: a_path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': a_contentLength,
            'user-type': "consultants",
			'dbname': 'User',
        }
    }

    if (a_remote === true || remote === true) {
        ret.host = '1.1.1.'
        ret.port = 3000
        ret.headers.origin = 'www.w.com'
    }

    ret.host = ret.host ? ret.host : "127.0.0.1"

    return ret
}

function run (a_path, a_content, a_remote = null) {
    let content = querystring.stringify(a_content)
    let options = init(a_path, content.length, a_remote)

    let req = http.request(options, function (res) {
        res.setEncoding('utf8')
        res.on('data', function (data) {
            console.log(data)
        })
    }).on('error', function (err) {
        console.log(a_path + " " + err.message)
    }).on('close', () => {
        // do nothing
    })

    req.write(content)
}

module.exports = { init, run }