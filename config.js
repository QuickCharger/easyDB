const path = require('path')

const DBName = 'EasyDB'
let config = {
    listen: 3000,

    sequelize: {
        dialect: 'sqlite',  // 'mysql' || 'sqlite'
        dbName: DBName,     // mysql时的数据库名 或 sqlite时的文件名称
        sqlite3_storage: path.join(__dirname, `${DBName}.db`), // dialect='mysql'失效
        timezone: "+00:00",                                    // dialect='sqlite'失效
        logging: console.log,
    }
}


if (process.argv.find((it) => it === 'release')) {
    console.log('release')
    config.logging = false
} else {
    console.log('develop')
}


module.exports = config