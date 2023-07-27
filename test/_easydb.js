let common = require('./common')

let view = {
	Id: 1
}
//common.run('/_easydb/view', view, false);

let create = {
	DBName: null,
	TableName: 'test2',
	Columns: [
		{ Name: 't1', Type: 'int' },
		{ Name: 't2', Type: 'string' },
	]
}
//common.run('/_easydb/create', create, false);

let update = {
	TableName: 'test1',
	Columns: [
		{ Name: 't1', Type: 'int' },
		{ Name: 't2', Type: 'string' },
	]
}
common.run('/_easydb/update', update, false);

let destroy = {
	TableName: 'test2',
}
//common.run('/_easydb/destroy', destroy, false)
