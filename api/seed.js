const faker = require('faker');
const db = require('./db');

(async () => {
    const people = [];
    const numberOfPeople = 30;
    
    for (let i = 0; i < numberOfPeople; i++) {
        people.push({
            name: `${faker.name.firstName().replace('\'', '\\\'')} ${faker.name.lastName().replace('\'', '\\\'')}`,
            phone: faker.phone.phoneNumber()
        });
    }
    
    let exitCode = 0;
    
    try {
        await db.openConnection();
        await db.createTable();
        await db.insertPeople(people);
    } catch (e) {
        console.error(e);
        exitCode = 1;
    }
    
    db.closeConnection();
    process.exit(exitCode);
})();
