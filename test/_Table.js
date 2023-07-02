let common = require('./common')

let view = {
	Id:1
};
//common.run('/_table/view', view, false);

let create = {
	TableName: 'test2',
	Column: [
		{Name: 't1', Type: 'int'},
		{Name: 't2', Type: 'int'},
	]
};
//common.run('/_table1/create', create, false);

let update = {
	TableName: 'test1',
	Column: [
		{Name: 'b2', Type: 'int'},
	]
};
//common.run('/_table/update', update, false);

let destroy = {
	TableName: 'test2',
};
common.run('/_table/destroy', destroy, false);
