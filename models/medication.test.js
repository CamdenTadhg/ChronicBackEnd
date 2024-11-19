"use strict"
process.env.NODE_ENV === "test";

const {
    NotFoundError,
    BadRequestError,
} = require('../expressError');
const db = require('../db.js');
const Medication = require("./medication.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll
} = require('./_testCommon.js');

let m1Id, u1Id, m3Id, m2Id, u2Id, m4Id, u3Id, mt1Id;
beforeAll(commonBeforeAll);
beforeEach(async () => {
    commonBeforeEach();
    const m1IdResult = await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'M1'`);
    m1Id = m1IdResult.rows[0].medId;
    const m2IdResult = await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'M2'`);
    m2Id = m2IdResult.rows[0].medId;
    const m3IdResult = await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'M3'`);
    m3Id = m3IdResult.rows[0].medId;
    const m4IdResult = await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'M4'`);
    m4Id = m4IdResult.rows[0].medId;
    const u1IdResult = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u1@test.com'`);
    u1Id = u1IdResult.rows[0].userId;
    const u2IdResult = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u2@test.com'`);
    u2Id = u2IdResult.rows[0].userId;
    const u3IdResult = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u3@test.com'`);
    u3Id = u3IdResult.rows[0].userId;
    const mt1IdResult = await db.query(`SELECT medtrack_id AS "medtrackId" FROM medication_tracking WHERE user_id = $1 AND med_id = $2 AND track_date = '2024-09-21' AND time_of_day = 'AM'`, [u1Id, m1Id]);
    mt1Id = mt1IdResult.rows[0].medtrackId;
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

expect.extend({
    toBeCorrectTimestamp(received, expected){
        //ensure both received and expected are Date objects
        if (!(received instanceof Date) || !(expected instanceof Date)) {
            return {
                message: () => 'expected both arguments to be Date objects',
                pass: false,
            };
        }
        //compare the timestamps
        const pass = received.getTime() === expected.getTime();

        if (pass) {
            return {
                message: () => `expected ${received.toISOString()} not to be equal to ${expected.toISOString()}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received.toISOString()} to be equal to ${expected.toISOString()}`,
                pass: false,
            };
        } 
    }
});

/**Medication.create */
describe('Medication.create', function(){
    test('works with correct info', async function(){
        const medication = await Medication.create({
            medicationName: 'M5'
        });
        expect(medication).toEqual({
            medId: expect.any(Number),
            medication: 'M5'
        });
        const found = await db.query(`SELECT * FROM medications WHERE medication = 'M5'`);
        expect(found.rows.length).toEqual(1);
    });
    test('Bad request with duplicate medication', async function(){
        try{
            await Medication.create({
                medicationName: 'M1'
            });
            fail();
        } catch(err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Medication.getAll */
describe('Medication.getAll', function(){});
    test('works', async function(){
        const medications = await Medication.getAll();
        expect(medications).toEqual([
            {
                medId: expect.any(Number),
                medication: 'M1'
            },
            {
                medId: expect.any(Number),
                medication: 'M2'
            },
            {
                medId: expect.any(Number),
                medication: 'M3'
            },
            {
                medId: expect.any(Number),
                medication: 'M4'
            }
        ]);
    });

/**Medication.getOne */
describe('Medication.getOne', function(){
    test('works for valid medication', async function(){
        const medication = await Medication.getOne(m1Id);
        expect(medication).toEqual(
            {
                medId: expect.any(Number),
                medication: 'M1'
            });
    });
    test('Notfound error for invalid medication', async function(){
        try{
            await Medication.getOne(0);
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});


/**Medication.edit */
describe('Medication.edit', function(){
    test('works for valid medication', async function(){
        const medication = await Medication.edit(m1Id, {medication: 'M1 capsule'});
        expect(medication).toEqual(
            {
                medId: m1Id,
                medication: 'M1 capsule'
            });
    });
    test('Notfound error for invalid medication', async function(){
        try {
            await Medication.edit(0, {medication: 'M0 capsule'});
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('Bad Request with duplicate medication', async function(){
        try{
            await Medication.edit(m1Id, {medication: 'M3'});
            fail();
        } catch(err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Medication.delete */
describe('Medication.delete', function(){
    test('works for valid medication', async function(){
        const medication = await Medication.delete(m4Id);
        const notFound = await db.query(`SELECT * FROM medications WHERE medication = 'M4'`);
        expect(notFound.rows.length).toEqual(0);
    });
    test('Notfound error for invalid medication', async function(){
        try{
            await Medication.delete(0);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Medication.userConnect */
describe('Medication.userConnect', function(){
    test('works for valid user & medication', async function(){
        const userMedication = await Medication.userConnect(u1Id, m3Id, {
            dosageNum: 300,
            dosageUnit: 'mg',
            timeOfDay: ['AM', 'PM']
        });
        expect(userMedication).toEqual({
            userId: u1Id,
            medId: m3Id,
            dosageNum: 300,
            dosageUnit: 'mg',
            timeOfDay: ['AM', 'PM']
        });
        const found = await db.query(`SELECT * FROM users_medications WHERE user_id = $1 AND med_id = $2`, [u1Id, m3Id]);
        expect(found.rows.length).toEqual(1);
    });
    test('NotFound error with invalid user', async function(){
        try{
            await Medication.userConnect(0, m3Id, {
                dosageNum: 300,
                dosageUnit: 'mg',
                timeOfDay: ['AM', 'PM']
            });
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound error with invalid medication', async function(){
        try{
            await Medication.userConnect(u1Id, 0, {
                dosageNum: 300,
                dosageUnit: 'mg',
                timeOfDay: ['AM', 'PM']
            });
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('BadRequest error with existing userMedication', async function(){
        try{
            await Medication.userConnect(u1Id, m1Id, {
                dosageNum: 300,
                dosageUnit: 'mg',
                timeOfDay: ['AM', 'PM']
            });
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Medication.userGet */
describe('Medication.userGet', function(){
    test('works with valid connection', async function(){
        const userMedication = await Medication.userGet(u1Id, m1Id);
        expect(userMedication).toEqual({
            userId: u1Id,
            medId: m1Id,
            dosageNum: 200,
            dosageUnit: 'mg', 
            timeOfDay: ['AM', 'PM']
        });
    });
    test('NotFound with invalid medication', async function(){
        try {
            await Medication.userGet(u1Id, 0);
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid user', async function(){
        try {
            await Medication.userGet(0, m1Id);
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid userMedication', async function(){
        try {
            await Medication.userGet(u1Id, m3Id);
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
})

/**Medication.userChange */
describe('Medication.userChange', function(){
    test('works for valid user & medication', async function(){
        const userMedication = await Medication.userChange(u1Id, m1Id, {
            newMedId: m3Id,
            dosageNum: 450,
            dosageUnit: 'mg', 
            timeOfDay: ['AM']
        });
        expect(userMedication).toEqual({
            userId: u1Id,
            medId: m3Id,
            dosageNum: 450,
            dosageUnit: 'mg',
            timeOfDay: ['AM']
        });
    });
    test('NotFound error with invalid userMedication', async function(){
        try{

            await Medication.userChange(u1Id, 0, {
                newMedId: m4Id,
                dosageNum: 450,
                dosageUnit: 'mg',
                timeOfDay: ['AM']
            });
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('BadRequest error with existing userMedication', async function(){
        try{
            await Medication.userChange(u1Id, m1Id, {
                newMedId: m2Id,
                dosageNum: 450,
                dosageUnit: 'mg',
                timeOfDay: ['AM']
            });
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Medication.userDisconnect */
describe('Medication.userDisconnect', function(){
    test('works for valid user & medication', async function(){
        await Medication.userDisconnect(u1Id, m1Id);
        const notfound = await db.query(`SELECT * FROM users_medications WHERE user_id = $1 AND med_id = $2`, [u1Id, m1Id]);
        expect(notfound.rows.length).toEqual(0);
    });
    test('NotFound error with invalid userMedication', async function(){
        try{
            await Medication.userDisconnect(u1Id, m3Id);
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Medication.track */
describe('Medication.track', function(){
    test('works with valid user & medication', async function(){
        const medTracking = await Medication.track({
            userId: u1Id,
            medId: m1Id,
            trackDate: '2024-09-23',
            timeOfDay: 'AM',
            number: 1
        });
        expect(medTracking).toEqual({
            medtrackId: expect.any(Number),
            userId: u1Id,
            medId: m1Id,
            trackDate: expect.any(Date), 
            timeOfDay: 'AM',
            dataTimestamp: expect.any(Date),
            number: 1,
            trackedAt: expect.any(Date)
        });
        expect.toBeCorrectTimestamp(medTracking.dataTimestamp, '2024-09-23T13:00:00.000Z');
        expect.toBeCorrectTimestamp(medTracking.trackDate, '2024-09-23T05:00:00.000Z');
        const currentTime = new Date();
        const timeDifference = Math.abs(currentTime - medTracking.trackedAt);
        expect(timeDifference).toBeLessThan(5000);
        const found = await db.query(`SELECT * FROM medication_tracking WHERE user_id = $1 AND med_id = $2 AND track_date = '2024-09-23' AND time_of_day = 'AM'`, [u1Id, m1Id]);
        expect(found.rows.length).toEqual(1);
    });
    test('NotFound error with invalid userMedication', async function(){
        try{
            await Medication.track({
                userId: u1Id,
                medId: m3Id,
                trackDate: '2024-09-23', 
                timeOfDay: 'PM',
                number: 1
            });
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('Bad request error with existing tracking record', async function(){
        try{
            await Medication.track({
                userId: u1Id,
                medId: m1Id,
                trackDate: '2024-09-21', 
                timeOfDay: 'AM',
                number: 3
            });
            fail();
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Symptom.getAllTracking */
describe('Medication.getAllTracking', function(){
    test('works with valid user & medication', async function(){
        const userRecords = await Medication.getAllTracking(u1Id);
        expect(userRecords).toEqual([
            {
                medtrackId: expect.any(Number),
                userId: expect.any(Number),
                medication: 'M1',
                trackDate: expect.any(Date),
                timeOfDay: 'AM', 
                dataTimestamp: expect.any(Date),
                number: 2,
            },
            {
                medtrackId: expect.any(Number),
                userId: expect.any(Number),
                medication: 'M1',
                trackDate: expect.any(Date),
                timeOfDay: 'PM', 
                dataTimestamp: expect.any(Date),
                number: 1,
            }
        ]);
        expect.toBeCorrectTimestamp(userRecords[0].dataTimestamp, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[0].trackDate, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[1].dataTimestamp, '2024-09-21T23:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[1].trackDate, '2024-09-21T05:00:00.000Z');
    });
    test('Returns empty array if no tracking information', async function(){
        const userRecords = await Medication.getAllTracking(u3Id);
        expect(userRecords).toEqual([])
    })
    test('NotFound error with invalid user', async function(){
        try{
            await Medication.getAllTracking(0)
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Medication.getOneTracking */
describe('Medication.getOneTracking', function(){
    test('works with valid tracking record', async function(){
        const medtrackIdResult = await db.query(`SELECT medtrack_id FROM medication_tracking WHERE time_of_day = 'PM'`);
        const medtrackId = medtrackIdResult.rows[0].medtrack_id;
        const trackingRecord = await Medication.getOneTracking(medtrackId);
        expect(trackingRecord).toEqual({
            medtrackId: medtrackId,
            userId: u1Id,
            medId: m1Id,
            trackDate: expect.any(Date), 
            timeOfDay: 'PM',
            dataTimestamp: expect.any(Date),
            number: 1,
        });
        expect.toBeCorrectTimestamp(trackingRecord.dataTimestamp, '2024-09-21T23:00:00.000Z');
        expect.toBeCorrectTimestamp(trackingRecord.trackDate, '2024-09-21T05:00:00.000Z');
    });
    test('NotFound error with invalid tracking record', async function(){
        try{
            await Medication.getOneTracking(0)
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Medication.getDayTracking */
describe('Medication.getDayTracking', function(){
    test('works with valid date', async function(){
        const dayTrackingRecords = await Medication.getDayTracking(u1Id, '2024-09-21');
        expect(dayTrackingRecords).toEqual({
            AM: {
                M1: 2,
                M2: null
            },
            Midday: {},
            PM: {
                M1: 1,
            },
            Evening: {}
        });
   });
    test('NotFound error with invalid user', async function(){
        try{
            await Medication.getDayTracking(0, '2024-09-21');
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('empty outline object if user has no medications', async function(){
        const dayTrackingRecords = await Medication.getDayTracking(u3Id, '2024-09-21');
        expect(dayTrackingRecords).toEqual({
            AM: {},
            Midday: {},
            PM: {},
            Evening: {}
        });
    });
    test('Returns outline object for day with no tracking', async function(){
        const dayTrackingRecords = await Medication.getDayTracking(u1Id, '2024-10-01');
        expect(dayTrackingRecords).toEqual({
            AM: {
                M1: null,
                M2: null
            },
            Midday: {},
            PM: {
                M1: null
            },
            Evening: {}
        }); 
    });
});

/**Medication.editTracking */
describe('Medication.editTracking', function(){
    test('works with valid tracking record', async function(){
        const medtrackRecord = await Medication.editTracking(u1Id, m1Id, '2024-09-21', 'AM', 1);
        expect(medtrackRecord).toEqual({
            medtrackId: expect.any(Number),
            userId: u1Id,
            medId: m1Id, 
            trackDate: expect.any(Date), 
            timeOfDay: 'AM',
            dataTimestamp: expect.any(Date),
            number: 1,
            trackedAt: expect.any(Date)
        });
        expect.toBeCorrectTimestamp(medtrackRecord.dataTimestamp, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(medtrackRecord.trackDate, '2024-09-21T05:00:00.000Z');
        const currentTime = new Date();
        const timeDifference = Math.abs(currentTime - medtrackRecord.trackedAt);
        expect(timeDifference).toBeLessThan(5000);
    });
    test('NotFound error with invalid tracking record', async function(){
        try{
            await Medication.editTracking(u1Id, m1Id, '2024-09-22', 'AM', 3);
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Medication.deleteTracking */
describe('Medication.deleteTracking', function(){
    test('works with valid tracking record', async function(){
        await Medication.deleteTracking(u1Id, mt1Id);
        const notfound = await db.query(`SELECT * FROM medication_tracking WHERE user_id = $1 AND med_id = $2 AND track_date = '2024-09-21' AND time_of_day = 'AM'`, [u1Id, m1Id]);
        expect(notfound.rows.length).toEqual(0);
    });
    test('NotFound error with invalid tracking record', async function(){
        try {
            await Medication.deleteTracking(u1Id, m1Id, '2024-09-23', 'PM');
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Medication.deleteDayTracking */
describe('Medication.deleteDayTracking', function(){
    test('works with valid date', async function(){
        await Medication.deleteDayTracking(u1Id, '2024-09-21');
        const notfound = await db.query(`SELECT * FROM medication_tracking WHERE user_id = $1 AND track_date = '2024-09-21'`, [u1Id]);
        expect(notfound.rows.length).toEqual(0);
    });
    test('NotFound error with invalid date', async function(){
        try {
            await Medication.deleteDayTracking(u1Id, '2024-09-23');
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});
