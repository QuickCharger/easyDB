const path = require('path')

let config = {
    listen: 3000,

    // internal config. DO NOT MOD. begin  // easyDB 内部配置 勿修改。开始
    // The configuration for easyDB is stored in an EasyDB database, which can be either SQLite or MySQL based on the user's configuration. 
    // easyDB的所有配置都存储在EasyDB数据库中， 该数据库为sqlite。实际运行时生成的数据库使用mysql或sqlite依靠下方的用户配置
    // sequelize_internal: {
    //     dialect: 'sqlite',
    //     dbName: 'EasyDB',
    //     storage_path: path.join(__dirname, `db`),
    //     logging: console.log,
    // },
    // internal config. DO NOT MOD. end  // easyDB 内部配置 勿修改。结束


    // for user modify. begin  // 用户修改部分。 开始
    // when run in release, use sqlite or mysql
    // release运行时 使用sqlite或mysql
    sql_config: {
        // sqlite
        dialect: 'sqlite',
        storage_path: path.join(__dirname, `db`),
        // logging: console.log,
        logging: false,

        // // mysql
        // dialect: 'mysql',
        // host: "127.0.0.1",
        // port: 3306,
        // username: "root",
        // password: "123456",
        // // dbName: "mysql",     // 此处使用EasyDB表的数据
        // logging: console.log,
        // // logging: false,
        // timezone: "+00:00",
    }
    // for user modify. end  // 用户修改部分。 结束
}


if (process.argv.find((it) => it === 'release')) {
    console.log('release')
    config.logging = false
} else {
    console.log('develop')
}

module.exports = config