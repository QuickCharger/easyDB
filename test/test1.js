let common = require('./common')

let index = {
    begin:0,
    count:10,
    filters:[

    ]
};
common.run('/test1/index', index, false);

let view = {
	Id: 2,
};
//common.run('/test1/view', view, false);

let create = {
	t1: 2222,
	t2: '44445a55',
};
common.run('/test1/create', create, false);

let update = {
	Id: 2,
	t1: 2222,
	t2: '44445a55',
};
//common.run('/test1/update', update, false);
