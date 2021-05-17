const pgp = require('pg-promise')();

const connectionString =
	'postgres://clzwrtkw:3L2zziH_repYSn8V-rvLlSqpq1Li0Gln@queenie.db.elephantsql.com:5432/clzwrtkw';
const db = pgp(connectionString);

module.exports = db;
