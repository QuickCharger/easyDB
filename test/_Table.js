let common = require('./common')

let create = {
	TableName: 'test1',
	Column: [
		{Name: 'b1', Type: 'int'},
		{Name: 'b2', Type: 'int'},
	]
};
common.run('/_table/create', create, false);
