require('dotenv').config();
const uuid = require('uuid');
const redis = require('redis');
const mysql = require('mysql');
const morgan = require('morgan');
const express = require('express');
const { promisify } = require('util');
const path = require('path');
const winston = require('winston');
const cors = require('cors');

const client = redis.createClient({
    host: process.env.REDIS_URL,
    port: process.env.REDIS_PORT,
});
const conn = mysql.createConnection({
    host: process.env.DATABASE_URL,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    database: process.env.DATABASE_NAME,
});

client.on('error', console.error);

const redisSetAsync = promisify(client.set).bind(client);
const redisGetAsync = promisify(client.get).bind(client);
const mysqlConnectAsync = promisify(conn.connect).bind(conn);
const mysqlQueryAsync = promisify(conn.query).bind(conn);

const createTable = async () => {
    try {
        await mysqlQueryAsync(
            'CREATE TABLE people (id VARCHAR(255) NOT NULL PRIMARY KEY, name VARCHAR(255), age INTEGER)'
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

const insertPerson = async (name, age) => {
    try {
        return await mysqlQueryAsync(
            `INSERT INTO people (id, name, age) VALUES ('${uuid.v4()}', '${name}', ${age})`
        );
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

const updatePerson = async (id, name, age) => {
    try {
        return await mysqlQueryAsync(
            `UPDATE people SET name = ${name}, age = ${age} WHERE id = ${id}`
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

const initLogger = () => {
    const options = {
        file: {
            level: 'info',
            filename: path.join('/var/log/demo_app.log'),
            handleExceptions: true,
            json: false,
            maxsize: 5242880,
            maxFiles: 5,
            colorize: false,
        },
        console: {
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true,
        },
    };

    const logger = winston.createLogger({
        format: winston.format.simple(),
        transports: [
            new winston.transports.File(options.file),
            new winston.transports.Console(options.console),
        ],
        exitOnError: false,
    });

    logger.stream = {
        write: function (message, encoding) {
            logger.info(message);
        },
    };

    return logger;
};

const runApplication = async () => {
    await mysqlConnectAsync();
    await createTable();

    const app = express();
    const port = process.env.APP_PORT || 3000;
    const logger = initLogger();

    app.use(cors());

    app.use(
        morgan(
            ':method :url :status :res[content-length] - :response-time ms',
            { stream: logger.stream }
        )
    );

    app.listen(port, '0.0.0.0', () => {
        console.log(`Application running on http://0.0.0.0:${port}`);
    });

    app.get('/', (req, res) => {
        res.send('hello');
    });

    app.get('/people', async (req, res) => {
        const people = await selectAllPeople();
        res.json(people);
    });

    app.get('/person/:id', async (req, res) => {
        const person = await selectPerson(req.params.id, logger);
        res.json(person);
    });

    app.post('/person', async (req, res) => {
        const person = await insertPerson(
            uuid.v4(),
            req.body.name,
            req.body.age
        );
        res.json(person);
    });

    app.put('/person/:id', async (req, res) => {
        const person = await updatePerson(
            req.params.id,
            req.body.name,
            req.body.age
        );
        res.json(person);
    });

    app.delete('/person/:id', async (req, res) => {
        await deletePerson(req.params.id);
        res.end();
    });

    process.on('SIGINT', () => {
        console.log('closing app');
        client.end(true);
        conn.destroy();
        process.exit();
    });
};

runApplication();
