const morgan = require('morgan');
const express = require('express');
const path = require('path');
const winston = require('winston');
const cors = require('cors');
const db = require('./db');

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
    await db.openConnection();

    const app = express();
    const port = process.env.APP_PORT || 3000;
    const logger = initLogger();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

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
        const people = await db.selectAllPeople();
        res.json(people);
    });

    app.get('/person/:id', async (req, res) => {
        const person = await db.selectPerson(req.params.id, logger);
        res.json(person);
    });

    app.post('/person', async (req, res) => {
        const person = await db.insertPerson(req.body.name, req.body.age);
        res.json(person);
    });

    app.put('/person/:id', async (req, res) => {
        const person = await db.updatePerson(
            req.params.id,
            req.body.name,
            req.body.age
        );
        res.json(person);
    });

    app.delete('/person/:id', async (req, res) => {
        await db.deletePerson(req.params.id);
        res.end();
    });

    process.on('SIGINT', () => {
        console.log('closing app');
        db.closeConnection();
        process.exit();
    });
};

runApplication();
