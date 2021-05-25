require('dotenv').config();
const uuid = require('uuid');
const redis = require('redis');
const mysql = require('mysql');
const { promisify } = require('util');

let conn = null;
let client = null;

let redisSetAsync = null;
let redisGetAsync = null;
let mysqlQueryAsync = null;

const openConnection = async () => {
    if (!client) {
        client = redis.createClient({
            host: process.env.REDIS_URL,
            port: process.env.REDIS_PORT,
        });
        client.on('error', console.error);
        redisSetAsync = promisify(client.set).bind(client);
        redisGetAsync = promisify(client.get).bind(client);
    }
    
    if (!conn) {
        conn = mysql.createConnection({
            host: process.env.DATABASE_URL,
            user: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASS,
            database: process.env.DATABASE_NAME,
        });
        mysqlQueryAsync = promisify(conn.query).bind(conn);
        return await promisify(conn.connect).bind(conn)();
    }
};

const closeConnection = () => {
    if (!client) client.end(true);
    if (!conn) conn.destroy();
}

const createTable = async () => {
    try {
        await mysqlQueryAsync(
            'CREATE TABLE people (id VARCHAR(255) NOT NULL PRIMARY KEY, name VARCHAR(255), phone VARCHAR(255))'
        );
    } catch (e) {
        console.log('table exists already!');
    }
};

const dropTable = async () => {
    try {
        await mysqlQueryAsync('DROP TABLE IF EXISTS people');
    } catch (e) {
        console.log('table does not exist!');
    }
};

const insertPerson = async (name, phone) => {
    try {
        return await mysqlQueryAsync(
            `INSERT INTO people (id, name, phone) VALUES ('${uuid.v4()}', '${name}', ${phone})`
        );
    } catch (e) {
        console.log(e);
        return e;
    }
};

const insertPeople = async people => {
    try {
        const values = people.map(p => `('${uuid.v4()}', '${p.name}', '${p.phone}')`).join(', ');
        return await mysqlQueryAsync('INSERT INTO people (id, name, phone) VALUES ' + values);
    } catch (e) {
        return e;
    }
};

const selectAllPeople = async () => {
    try {
        return await mysqlQueryAsync('SELECT * FROM people');
    } catch (e) {
        return e;
    }
};

const selectPerson = async (id, logger = { info: console.log }) => {
    let person = await redisGetAsync(id);
    logger.info('from cache:', person);
    if (person) return JSON.parse(person);
    try {
        person = await mysqlQueryAsync(
            `SELECT * FROM people WHERE id = '${id}'`
        );
        await redisSetAsync(id, JSON.stringify(person));
        logger.info('from db:', person);
        return person;
    } catch (e) {
        return e;
    }
};

const updatePerson = async (id, name, phone) => {
    try {
        return await mysqlQueryAsync(
            `UPDATE people SET name = ${name}, phone = ${phone} WHERE id = ${id}`
        );
    } catch (e) {
        return e;
    }
};

const deletePerson = async id => {
    try {
        return await mysqlQueryAsync(`DELETE FROM people WHERE id = ${id}`);
    } catch (e) {
        return e;
    }
};

module.exports = {
    openConnection,
    closeConnection,
    createTable,
    selectPerson,
    selectAllPeople,
    insertPerson,
    insertPeople,
    updatePerson,
    deletePerson
};