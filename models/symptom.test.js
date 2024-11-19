"use strict"
process.env.NODE_ENV === "test";

const {
    NotFoundError,
    BadRequestError,
} = require('../expressError');
const db = require('../db.js');
const Symptom = require("./symptom.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll
} = require('./_testCommon.js');

let s1Id, u1Id, s3Id, s4Id, s2Id, u2Id, st1Id;
beforeAll(commonBeforeAll);
beforeEach(async () => {
    commonBeforeEach();
    const s1Result = await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'S1'`);
    s1Id = s1Result.rows[0].symptomId;
    const s2Result = await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'S2'`);
    s2Id = s2Result.rows[0].symptomId;
    const s3Result = await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'S3'`);
    s3Id = s3Result.rows[0].symptomId;
    const s4Result = await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'S4'`);
    s4Id = s4Result.rows[0].symptomId;
    const u1Result = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u1@test.com'`);
    u1Id = u1Result.rows[0].userId;
    const u2Result = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u2@test.com'`);
    u2Id = u2Result.rows[0].userId;
    const mt1Result = await db.query(`SELECT symtrack_id AS "symtrackId" FROM symptom_tracking WHERE user_id = $1 AND symptom_id = $2 AND track_date = '2024-09-21' AND timespan = '12-4 AM'`, [u1Id, s1Id]);
    st1Id = mt1Result.rows[0].symtrackId
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

/**Symptom.create */
describe('Symptom.create', function(){
    test('works with correct info', async function(){
        const symptom = await Symptom.create({
            symptomName: 'lethargy'
        });
        expect(symptom).toEqual({
            symptomId: expect.any(Number),
            symptom: 'lethargy'
        });
        const found = await db.query(`SELECT * FROM symptoms WHERE symptom = 'lethargy'`);
        expect(found.rows.length).toEqual(1);
    });
    test('Bad request with duplicate symptom', async function(){
        try{
            await Symptom.create({
                symptomName: 'S1'
            });
            fail();
        } catch(err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Symptom.getAll */
describe('Symptom.getAll', function(){});
    test('works', async function(){
        const symptoms = await Symptom.getAll();
        expect(symptoms).toEqual([
            {
                symptomId: expect.any(Number),
                symptom: 'S1'
            },
            {
                symptomId: expect.any(Number),
                symptom: 'S2'
            },
            {
                symptomId: expect.any(Number),
                symptom: 'S3'
            },
            {
                symptomId: expect.any(Number),
                symptom: 'S4'
            }
        ]);
    });

/**Symptom.getOne */
describe('Symptom.getOne', function(){
    test('works for valid symptom', async function(){
        const symptom = await Symptom.getOne(s1Id);
        expect(symptom).toEqual(
            {
                symptomId: expect.any(Number),
                symptom: 'S1'
            });
    });
    test('Notfound error for invalid symptom', async function(){
        try{
            await Symptom.getOne(0);
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});


/**Symptom.edit */
describe('Symptom.edit', function(){
    test('works for valid symptom', async function(){
        const symptom = await Symptom.edit(s1Id, {symptom: 'S1 pain'});
        expect(symptom).toEqual(
            {
                symptomId: s1Id,
                symptom: 'S1 pain'
            });
    });
    test('Notfound error for invalid symptom', async function(){
        try {
            await Symptom.edit(0, {symptom: 'S0 pain'});
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('Bad Request with duplicate symptom', async function(){
        try{
            await Symptom.edit(s1Id, {symptom: 'S3'});
            fail();
        } catch(err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Symptom.delete */
describe('Symptom.delete', function(){
    test('works for valid symptom', async function(){
        const symptom = await Symptom.delete(s4Id);
        const notFound = await db.query(`SELECT * FROM symptoms WHERE symptom = 'S4'`);
        expect(notFound.rows.length).toEqual(0);
    });
    test('Notfound error for invalid symptom', async function(){
        try{
            await Symptom.delete(0);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Symptom.userConnect */
describe('Symptom.userConnect', function(){
    test('works for valid user & symptom', async function(){
        const userSymptom = await Symptom.userConnect(u1Id, s3Id);
        expect(userSymptom).toEqual({
            userId: u1Id,
            symptomId: s3Id
        });
        const found = await db.query(`SELECT * FROM users_symptoms WHERE user_id = $1 AND symptom_id = $2`, [u1Id, s3Id]);
        expect(found.rows.length).toEqual(1);
    });
    test('NotFound error with invalid user', async function(){
        try{
            await Symptom.userConnect(0, s1Id);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound error with invalid symptom', async function(){
        try{
            await Symptom.userConnect(u1Id, 0);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('BadRequest error with existing userSymptom', async function(){
        try{
            await Symptom.userConnect(u1Id, s1Id);
            fail();
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Symptom.userGet */
describe('Symptom.userGet', function(){
    test('works with valid connection', async function(){
        const userSymptom = await Symptom.userGet(u1Id, s1Id);
        expect(userSymptom).toEqual({
            userId: u1Id,
            symptomId: s1Id,
        });
    });
    test('NotFound with invalid symptom', async function(){
        try {
            await Symptom.userGet(u1Id, 0);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid user', async function(){
        try {
            await Symptom.userGet(0, s1Id);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid userSymptom', async function(){
        try {
            await Symptom.userGet(u1Id, s3Id);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
})

/**Symptom.userChange */
describe('Symptom.userChange', function(){
    test('works for valid user & symptom', async function(){
        const userSymptom = await Symptom.userChange(u1Id, s1Id, {newSymptomId: s3Id});
        expect(userSymptom).toEqual({
            userId: u1Id,
            symptomId: s3Id
        });
    });
    test('NotFound error with invalid userSymptom', async function(){
        try{

            await Symptom.userChange(0, s1Id, {newSymptomId: s2Id});
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('BadRequest error with existing userSymptom', async function(){
        try{
            await Symptom.userChange(u1Id, s1Id, {newSymptomId: s2Id});
            fail();
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Symptom.userDisconnect */
describe('Symptom.userDisconnect', function(){
    test('works for valid user & symptom', async function(){
        await Symptom.userDisconnect(u1Id, s1Id);
        const notfound = await db.query(`SELECT * FROM users_symptoms WHERE user_id = $1 AND symptom_id = $2`, [u1Id, s1Id]);
        expect(notfound.rows.length).toEqual(0);
    });
    test('NotFound error with invalid userSymptom', async function(){
        try{
            await Symptom.userDisconnect(u1Id, s3Id);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Symptom.track */
describe('Symptom.track', function(){
    test('works with valid user & symptom', async function(){
        const symptomTracking = await Symptom.track({
            userId: u1Id,
            symptomId: s1Id,
            trackDate: '2024-09-23',
            timespan: '8 AM-12 PM',
            severity: 3
        });
        expect(symptomTracking).toEqual({
            symtrackId: expect.any(Number),
            userId: u1Id,
            symptomId: s1Id,
            trackDate: expect.any(Date), 
            timespan: '8 AM-12 PM',
            severity: 3,
            trackedAt: expect.any(Date),
            dataTimestamp: expect.any(Date)
        });
        expect.toBeCorrectTimestamp(symptomTracking.dataTimestamp, '2024-09-23T13:00:00.000Z');
        expect.toBeCorrectTimestamp(symptomTracking.trackDate, '2024-09-23T05:00:00.000Z');
        const currentTime = new Date();
        const timeDifference = Math.abs(currentTime - symptomTracking.trackedAt);
        expect(timeDifference).toBeLessThan(5000);
        const found = await db.query(`SELECT * FROM symptom_tracking WHERE user_id = $1 AND symptom_id = $2 AND track_date = '2024-09-23' AND timespan = '8 AM-12 PM'`, [u1Id, s1Id]);
        expect(found.rows.length).toEqual(1);
    });
    test('NotFound error with invalid userSymptom', async function(){
        try{
            await Symptom.track({
                userId: u1Id,
                symptomId: s3Id,
                trackDate: '2024-09-23', 
                timespan: '12-4 AM',
                severity: 1
            });
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('Bad request error with existing tracking record', async function(){
        try{
            await Symptom.track({
                userId: u1Id,
                symptomId: s1Id,
                trackDate: '2024-09-21', 
                timespan: '12-4 AM',
                severity: 1
            });
            fail();
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/**Symptom.getAllTracking */
describe('Symptom.getAllTracking', function(){
    test('works with valid user & symptom', async function(){
        const userRecords = await Symptom.getAllTracking(u1Id);
        expect(userRecords).toEqual([
            {
                symtrackId: expect.any(Number),
                userId: u1Id,
                symptom: 'S1',
                trackDate: expect.any(Date),
                timespan: '12-4 AM', 
                dataTimestamp: expect.any(Date),
                severity: 3
            },
            {
                symtrackId: expect.any(Number),
                userId: expect.any(Number),
                symptom: 'S1',
                trackDate: expect.any(Date),
                timespan: '8 AM-12 PM', 
                dataTimestamp: expect.any(Date),
                severity: 2,
            },
            {
                symtrackId: expect.any(Number),
                userId: expect.any(Number),
                symptom: 'S1',
                trackDate: expect.any(Date),
                timespan: '12-4 PM', 
                dataTimestamp: expect.any(Date),
                severity: 1,
            }
        ])
        expect.toBeCorrectTimestamp(userRecords[0].dataTimestamp, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[0].trackDate, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[1].dataTimestamp, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[1].trackDate, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[2].dataTimestamp,'2024-09-22T17:00:00.000Z');
        expect.toBeCorrectTimestamp(userRecords[2].trackDate, '2024-09-22T05:00:00.000Z');
    });
    test('Returns empty array if no tracking information', async function(){
        const userRecords = await Symptom.getAllTracking(u2Id);
        expect(userRecords).toEqual([])
    })
    test('NotFound error with invalid user', async function(){
        try{
            await Symptom.getAllTracking(0)
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Symptom.getOneTracking */
describe('Symptom.getOneTracking', function(){
    test('works with valid tracking record', async function(){
        const symtrackIdResult = await db.query(`SELECT symtrack_id AS "symtrackId" FROM symptom_tracking WHERE timespan = '12-4 PM'`);
        const symtrackId = symtrackIdResult.rows[0].symtrackId
        const trackingRecord = await Symptom.getOneTracking(symtrackId);
        expect(trackingRecord).toEqual({
            symtrackId: symtrackId,
            userId: u1Id,
            symptomId: s1Id,
            trackDate: expect.any(Date), 
            timespan: '12-4 PM',
            dataTimestamp: expect.any(Date),
            severity: 1,
        });
        expect.toBeCorrectTimestamp(trackingRecord.dataTimeStamp, '2024-09-22T17:00:00.000Z');
        expect.toBeCorrectTimestamp(trackingRecord.trackDate, '2024-09-22T05:00:00.000Z');
    });
    test('NotFound error with invalid tracking record', async function(){
        try{
            await Symptom.getOneTracking(0)
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Symptom.getDayTracking */
describe('Symptom.getDayTracking', function(){
    test('works with valid date', async function(){
        const dayTrackingRecords = await Symptom.getDayTracking(u1Id, '2024-09-21');
        expect(dayTrackingRecords).toEqual({
           'S1': {
                '12-4 AM': 3,
                '8 AM-12 PM': 2
            },
            'S2': {}
        });
    });
    test('NotFound error with invalid user', async function(){
        try{
            await Symptom.getDayTracking(0, '2024-09-21');
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('empty object if user has no symptoms', async function() {
        const dayTrackingRecords = await Symptom.getDayTracking(u2Id, '2024-10-01');
        expect(dayTrackingRecords).toEqual({});
    });
    test('Returns empty object of symptoms for day with no tracking', async function(){
        const dayTrackingRecords = await Symptom.getDayTracking(u1Id, '2024-10-01');
        expect(dayTrackingRecords).toEqual({
            'S1': {},
            'S2': {}
        }); 
    });
});

/**Symptom.editTracking */
describe('Symptom.editTracking', function(){
    test('works with valid tracking record', async function(){
        const symtrackRecord = await Symptom.editTracking(u1Id, s1Id, '2024-09-21', '12-4 AM', 5);
        expect(symtrackRecord).toEqual({
            symtrackId: expect.any(Number),
            userId: u1Id,
            symptomId: s1Id, 
            trackDate: expect.any(Date), 
            timespan: '12-4 AM',
            dataTimestamp: expect.any(Date),
            severity: 5,
            trackedAt: expect.any(Date)
        });
        expect.toBeCorrectTimestamp(symtrackRecord.dataTimestamp, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(symtrackRecord.trackDate, '2024-09-21T05:00:00.000Z');
        const currentTime = new Date();
        const timeDifference = Math.abs(currentTime - symtrackRecord.trackedAt);
        expect(timeDifference).toBeLessThan(5000);
    });
    test('NotFound error with invalid tracking record', async function(){
        try{
            await Symptom.editTracking(u1Id, s1Id, '2024-09-22', '12-4 AM', 3);
            fail();
        } catch(err){
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Symptom.deleteTracking */
describe('Symptom.deleteTracking', function(){
    test('works with valid tracking record', async function(){
        await Symptom.deleteTracking(st1Id);
        const notfound = await db.query(`SELECT * FROM symptom_tracking WHERE user_id = $1 AND symptom_id = $2 AND track_date = '2024-09-21' AND timespan = '12-4 AM'`, [u1Id, s1Id]);
        expect(notfound.rows.length).toEqual(0);
    });
    test('NotFound error with invalid tracking record', async function(){
        try {
            await Symptom.deleteTracking(u1Id, st1Id);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Symptom.deleteDayTracking */
describe('Symptom.deleteDayTracking', function(){
    test('works with valid date', async function(){
        const trackDate = '2024-09-21'
        await Symptom.deleteDayTracking(u1Id, trackDate);
        const notfound = await db.query(`SELECT * FROM symptom_tracking WHERE user_id = $1 AND track_date = $2`, [u1Id, trackDate]);
        expect(notfound.rows.length).toEqual(0);
    });
    test('NotFound error with invalid date', async function(){
        try {
            const trackDate = '2024-10-01'
            await Symptom.deleteDayTracking(u1Id, trackDate);
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});
