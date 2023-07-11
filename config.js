const path = require('path')

const DBName = 'EasyDB'
module.exports = {
    sequelize: {
        dialect: 'sqlite',    // 'mysql' || 'sqlite'
        dbName: DBName,
        sqlite3_storage: path.join(__dirname, `${DBName}.db`), // dialect='mysql'失效
        timezone: "+00:00",                                    // dialect='sqlite'失效
        logging: console.log,
    }
}