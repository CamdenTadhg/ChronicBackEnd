"use strict";
process.env.NODE_ENV === "test";

const request = require("supertest");
const db = require('../db.js');
const app = require('../app.js');
const Data = require('./data');

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterAll,
    commonAfterEach,
    u1IdToken,
    u2Token,
    u3Token
} = require('./_testCommon.js');
const { NotFoundError } = require("../expressError.js");

let s1Id, s2Id, s3Id, u1Id, m1Id, m2Id, m3Id;
beforeAll(commonBeforeAll);
beforeEach(async () => {
    commonBeforeEach();
    const s1IdResult = await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'S1'`);
    s1Id = s1IdResult.rows[0].symptomId;
    const s2IdResult = await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'S2'`);
    s2Id = s2IdResult.rows[0].symptomId;
    const s3IdResult = await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'S3'`);
    s3Id = s3IdResult.rows[0].symptomId;
    const u1IdResult = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u1@test.com'`);
    u1Id = u1IdResult.rows[0].userId;
    await db.query(`INSERT INTO users_symptoms(user_id, symptom_id) VALUES (${u1Id}, ${s3Id})`);
    await db.query(`INSERT INTO symptom_tracking (user_id, symptom_id, track_date, timespan, severity) 
        VALUES  (${u1Id}, ${s1Id}, '2024-09-21', '4-8 AM', 3),
                (${u1Id}, ${s1Id}, '2024-09-21', '4-8 PM', 5),
                (${u1Id}, ${s2Id}, '2024-09-21', '12-4 AM', 3),
                (${u1Id}, ${s2Id}, '2024-09-21', '4-8 AM', 2),
                (${u1Id}, ${s2Id}, '2024-09-21', '8 AM-12 PM', 1),
                (${u1Id}, ${s2Id}, '2024-09-21', '12-4 PM', 4),
                (${u1Id}, ${s2Id}, '2024-09-21', '4-8 PM', 3),
                (${u1Id}, ${s2Id}, '2024-09-21', '8 PM-12 AM', 2),
                (${u1Id}, ${s3Id}, '2024-09-21', '12-4 AM', 1),
                (${u1Id}, ${s3Id}, '2024-09-21', '4-8 AM', 2),
                (${u1Id}, ${s3Id}, '2024-09-21', '8 AM-12 PM', 3),
                (${u1Id}, ${s3Id}, '2024-09-21', '12-4 PM', 1),
                (${u1Id}, ${s3Id}, '2024-09-21', '4-8 PM', 3),
                (${u1Id}, ${s3Id}, '2024-09-21', '8 PM-12 AM', 1)`);
    const m1IdResult = await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'M1'`);
    m1Id = m1IdResult.rows[0].medId;
    const m2IdResult = await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'M2'`);
    m2Id = m2IdResult.rows[0].medId;
    const m3IdResult = await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'M3'`);
    m3Id = m3IdResult.rows[0].medId;
    await db.query(`INSERT INTO users_medications ( user_id, 
                                                    med_id, 
                                                    dosage_num, 
                                                    dosage_unit, 
                                                    time_of_day) 
        VALUES ($1, $2, $3, $4, $5)`,
        [u1Id, m3Id, 1, 'pill', '{"AM", "Midday", "PM", "Evening"}']);
    await db.query(`INSERT INTO medication_tracking (user_id, med_id, track_date, time_of_day, number) 
        VALUES  (${u1Id}, ${m1Id}, '2024-09-22', 'AM', 1),
                (${u1Id}, ${m1Id}, '2024-09-22', 'PM', 1),
                (${u1Id}, ${m2Id}, '2024-09-21', 'AM', 1),
                (${u1Id}, ${m2Id}, '2024-09-22', 'AM', 2),
                (${u1Id}, ${m3Id}, '2024-09-21', 'AM', 1),
                (${u1Id}, ${m3Id}, '2024-09-21', 'Midday', 1),
                (${u1Id}, ${m3Id}, '2024-09-21', 'PM', 2),
                (${u1Id}, ${m3Id}, '2024-09-21', 'Evening', 1),
                (${u1Id}, ${m3Id}, '2024-09-22', 'AM', 1),
                (${u1Id}, ${m3Id}, '2024-09-22', 'Midday', 2),
                (${u1Id}, ${m3Id}, '2024-09-22', 'PM', 1),
                (${u1Id}, ${m3Id}, '2024-09-22', 'Evening', 1)`);
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

/** Data.symptoms */
describe('Data.symptoms', function(){
    test('works with correct data', async function(){
        const dataset = await Data.symptoms({
            userId: u1Id,
            startDate: '2024-09-21',
            endDate: '2024-09-21',
            symptoms: [s1Id, s2Id, s3Id]
        });
        expect(dataset).toEqual({
            S1: [
                {datetime: expect.any(Date), severity: 3},
                {datetime: expect.any(Date), severity: 3},
                {datetime: expect.any(Date), severity: 2},
                {datetime: expect.any(Date), severity: 5},
            ],
            S2: [
                {datetime: expect.any(Date), severity: 3},
                {datetime: expect.any(Date), severity: 2},
                {datetime: expect.any(Date), severity: 1},
                {datetime: expect.any(Date), severity: 4},
                {datetime: expect.any(Date), severity: 3},
                {datetime: expect.any(Date), severity: 2}
            ],
            S3: [
                {datetime: expect.any(Date), severity: 1},
                {datetime: expect.any(Date), severity: 2},
                {datetime: expect.any(Date), severity: 3},
                {datetime: expect.any(Date), severity: 1},
                {datetime: expect.any(Date), severity: 3},
                {datetime: expect.any(Date), severity: 1}
            ]
        });
        expect.toBeCorrectTimestamp(dataset.S1[0].datetime, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S1[1].datetime, '2024-09-21T09:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S1[2].datetime, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S1[3].datetime, '2024-09-21T21:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S2[0].datetime, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S2[1].datetime, '2024-09-21T09:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S2[2].datetime, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S2[3].datetime, '2024-09-21T17:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S2[4].datetime, '2024-09-21T21:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S2[5].datetime, '2024-09-22T01:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S3[0].datetime, '2024-09-21T05:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S3[1].datetime, '2024-09-21T09:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S3[2].datetime, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S3[3].datetime, '2024-09-21T17:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S3[4].datetime, '2024-09-21T21:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.S3[5].datetime, '2024-09-22T01:00:00.000Z');
    });
    test('not found error with invalid symptomId', async function(){
        try {
            const dataset = await Data.symptoms({
                userId: u1Id,
                startDate: '2024-09-01',
                endDate: '2024-09-31', 
                symptoms: [s1Id, 0, s3Id]
            });
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
            expect(err.message).toBe('Symptom 0 does not exist')
        }
    });
    test('not found error with symptom not assigned to user', async function(){
        const s5Result = await db.query(`INSERT INTO symptoms (symptom) VALUES ('S5') RETURNING symptom_id AS "symptomId"`);
        const s5Id = s5Result.rows[0].symptomId;
        try {
            const dataset = await Data.symptoms({
                userId: u1Id,
                startDate: '2024-09-21', 
                endDate: '2024-09-21', 
                symptoms: [s2Id, s3Id, s5Id]
            });
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
            expect(err.message).toBe(`Symptom ${s5Id} is not associated with this user`)
        }
    });
    test('no data if no tracking records exist', async function(){
        const dataset = await Data.symptoms({
            userId: u1Id,
            startDate: '2024-08-01',
            endDate: '2024-08-01', 
            symptoms: [s1Id, s2Id, s3Id]
        });
        expect(dataset).toEqual({
            S1: [],
            S2: [],
            S3: []
        });
    });
});

/** Data.meds */
describe('Data.meds', function(){
    test('works with correct data', async function(){
        const dataset = await Data.meds({
            userId: u1Id,
            startDate: '2024-09-21',
            endDate: '2024-09-22',
            meds: [m1Id, m2Id, m3Id]
        });
        expect(dataset).toEqual({
            M1: [
                {datetime: expect.any(Date), number: 2},
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 1},
            ],
            M2: [
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 2}
            ],
            M3: [
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 2},
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 2},
                {datetime: expect.any(Date), number: 1},
                {datetime: expect.any(Date), number: 1}
            ]
        });
        expect.toBeCorrectTimestamp(dataset.M1[0].datetime, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M1[1].datetime, '2024-09-21T23:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M1[2].datetime, '2024-09-22T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M1[3].datetime, '2024-09-22T23:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M2[0].datetime, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M2[1].datetime, '2024-09-22T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[0].datetime, '2024-09-21T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[1].datetime, '2024-09-21T17:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[2].datetime, '2024-09-21T23:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[3].datetime, '2024-09-22T03:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[4].datetime, '2024-09-22T13:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[5].datetime, '2024-09-22T17:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[6].datetime, '2024-09-22T23:00:00.000Z');
        expect.toBeCorrectTimestamp(dataset.M3[7].datetime, '2024-09-23T03:00:00.000Z');
    });
    test('not found error with invalid medId', async function(){
        try {
            const dataset = await Data.meds({
                userId: u1Id,
                startDate: '2024-09-01',
                endDate: '2024-09-31', 
                meds: [m1Id, 0, m3Id]
            });
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
            expect(err.message).toBe('Medication 0 does not exist')
        }
    });
    test('not found error with medication not assigned to user', async function(){
        const m5Result = await db.query(`INSERT INTO medications (medication) VALUES ('M5') RETURNING med_id AS "medId"`);
        const m5Id = m5Result.rows[0].medId;
        try {
            const dataset = await Data.meds({
                userId: u1Id,
                startDate: '2024-09-21', 
                endDate: '2024-09-21', 
                meds: [m2Id, m3Id, m5Id]
            });
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
            expect(err.message).toBe(`Medication ${m5Id} is not associated with this user`)
        }
    });
    test('no data if no tracking records exist', async function(){
        const dataset = await Data.meds({
            userId: u1Id,
            startDate: '2024-08-01',
            endDate: '2024-08-01', 
            meds: [m1Id, m2Id, m3Id]
        });
        expect(dataset).toEqual({
            M1: [],
            M2: [],
            M3: []
        });
    });
});