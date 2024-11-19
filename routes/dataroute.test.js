"use strict";
process.env.NODE_ENV === "test";

const request = require("supertest");
const db = require('../db.js');
const app = require('../app.js');
const Data = require('../models/data.js');
const {createToken} = require('../helpers/tokens');

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterAll,
    commonAfterEach,
    getU1Id,
    getU2Id,
    getU3Id,
    getS1Id,
    getS2Id,
    getS3Id,
    getM1Id,
    getM2Id,
    getM3Id
} = require('./_testCommon.js');
const Symptom = require("../models/symptom.js");
const Medication = require("../models/medication.js");

let u1Token, u2Token, u3Token;
beforeAll(commonBeforeAll);
beforeEach(async () => {
    commonBeforeEach();
    u1Token = createToken({userId: getU1Id(), email: 'u1@test.com', isAdmin: false});
    u2Token = createToken({userId: getU2Id(), email: 'u2@test.com', isAdmin: true});
    u3Token = createToken({userId: getU3Id(), email: 'u3@test.com', isAdmin: false});
    await Symptom.userConnect(getU1Id(), getS2Id(), []);
    await Symptom.userConnect(getU1Id(), getS3Id(), []);
    await Medication.userConnect(getU1Id(), getM2Id(), 300, 'mg', ['AM', 'PM']);
    await Medication.userConnect(getU1Id(), getM3Id(), 1, 'pill', ['AM', 'Midday', 'PM', 'Evening']);
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS1Id(),
        trackDate: '2024-09-21',
        timespan: '4-8 AM',
        severity: 3
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS1Id(),
        trackDate: '2024-09-21',
        timespan: '4-8 PM',
        severity: 5
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS2Id(),
        trackDate: '2024-09-21',
        timespan: '12-4 AM',
        severity: 3
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS2Id(),
        trackDate: '2024-09-21',
        timespan: '4-8 AM',
        severity: 2
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS2Id(),
        trackDate: '2024-09-21',
        timespan: '8 AM-12 PM',
        severity: 1
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS2Id(),
        trackDate: '2024-09-21',
        timespan: '12-4 PM',
        severity: 4
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS2Id(),
        trackDate: '2024-09-21',
        timespan: '4-8 PM',
        severity: 3
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS2Id(),
        trackDate: '2024-09-21',
        timespan: '8 PM-12 AM',
        severity: 2
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS3Id(),
        trackDate: '2024-09-21',
        timespan: '12-4 AM',
        severity: 1
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS3Id(),
        trackDate: '2024-09-21',
        timespan: '4-8 AM',
        severity: 2
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS3Id(),
        trackDate: '2024-09-21',
        timespan: '8 AM-12 PM',
        severity: 3
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS3Id(),
        trackDate: '2024-09-21',
        timespan: '12-4 PM',
        severity: 1
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS3Id(),
        trackDate: '2024-09-21',
        timespan: '4-8 PM',
        severity: 3
    });
    await Symptom.track({
        userId: getU1Id(), 
        symptomId: getS3Id(),
        trackDate: '2024-09-21',
        timespan: '8 PM-12 AM',
        severity: 1
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM1Id(),
        trackDate: '2024-09-22',
        timeOfDay: 'AM',
        number: 1
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM1Id(),
        trackDate: '2024-09-22',
        timeOfDay: 'PM',
        number: 1
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM2Id(),
        trackDate: '2024-09-21',
        timeOfDay: 'AM',
        number: 1
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM2Id(),
        trackDate: '2024-09-22',
        timeOfDay: 'AM',
        number: 2
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM3Id(),
        trackDate: '2024-09-21',
        timeOfDay: 'AM',
        number: 1
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM3Id(),
        trackDate: '2024-09-21',
        timeOfDay: 'Midday',
        number: 1
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM3Id(),
        trackDate: '2024-09-21',
        timeOfDay: 'PM',
        number: 2
    });
    await Medication.track({
        userId: getU1Id(),
        medId: getM3Id(),
        trackDate: '2024-09-21',
        timeOfDay: 'Evening',
        number: 1
    });
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** GET /data/symptoms */
describe('GET /data/symptoms', function(){
    test('works for admin to get data', async function(){
        const resp = await request(app)
            .get(`/data/symptoms?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&symptoms=${getS1Id()}&symptoms=${getS2Id()}&symptoms=${getS3Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({dataset: {
            S1: [
                {datetime: '2024-09-21T05:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T09:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T13:00:00.000Z', severity: 2},
                {datetime: '2024-09-21T17:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T21:00:00.000Z', severity: 5},
            ],
            S2: [
                {datetime: '2024-09-21T05:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T09:00:00.000Z', severity: 2},
                {datetime: '2024-09-21T13:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T17:00:00.000Z', severity: 4},
                {datetime: '2024-09-21T21:00:00.000Z', severity: 3},
                {datetime: '2024-09-22T01:00:00.000Z', severity: 2}
            ],
            S3: [
                {datetime: '2024-09-21T05:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T09:00:00.000Z', severity: 2},
                {datetime: '2024-09-21T13:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T17:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T21:00:00.000Z', severity: 3},
                {datetime: '2024-09-22T01:00:00.000Z', severity: 1}
            ]
        }})
    });
    test('works for matching user to get data', async function(){
        const resp = await request(app)
            .get(`/data/symptoms?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&symptoms=${getS1Id()}&symptoms=${getS2Id()}&symptoms=${getS3Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({dataset: {
            S1: [
                {datetime: '2024-09-21T05:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T09:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T13:00:00.000Z', severity: 2},
                {datetime: '2024-09-21T17:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T21:00:00.000Z', severity: 5},
            ],
            S2: [
                {datetime: '2024-09-21T05:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T09:00:00.000Z', severity: 2},
                {datetime: '2024-09-21T13:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T17:00:00.000Z', severity: 4},
                {datetime: '2024-09-21T21:00:00.000Z', severity: 3},
                {datetime: '2024-09-22T01:00:00.000Z', severity: 2}
            ],
            S3: [
                {datetime: '2024-09-21T05:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T09:00:00.000Z', severity: 2},
                {datetime: '2024-09-21T13:00:00.000Z', severity: 3},
                {datetime: '2024-09-21T17:00:00.000Z', severity: 1},
                {datetime: '2024-09-21T21:00:00.000Z', severity: 3},
                {datetime: '2024-09-22T01:00:00.000Z', severity: 1}
            ]
        }})
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/data/symptoms?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&symptoms=${getS1Id()}&symptoms=${getS2Id()}&symptoms=${getS3Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/data/symptoms?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&symptoms=${getS1Id()}&symptoms=${getS2Id()}&symptoms=${getS3Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .get(`/data/symptoms?userId=${getU1Id()}&endDate=2024-09-21&symptoms=${getS1Id()}&symptoms=${getS2Id()}&symptoms=${getS3Id()}`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "startDate"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .get(`/data/symptoms?userId=u1@test.com&startDate=2024-09-21&endDate=2024-09-21&symptoms=${getS1Id()}&symptoms=${getS2Id()}&symptoms=${getS3Id()}`)            
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.userId is not of a type(s) number');
    });
});

/** GET /data/meds */
describe('GET /data/meds', function(){
    test('works for admin to get data', async function(){
        const resp = await request(app)
            .get(`/data/meds?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&meds=${getM1Id()}&meds=${getM2Id()}&meds=${getM3Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({dataset: {
            M1: [
                {datetime: '2024-09-21T13:00:00.000Z', number: 2},
                {datetime: '2024-09-21T23:00:00.000Z', number: 1}
            ],
            M2: [
                {datetime: '2024-09-21T13:00:00.000Z', number: 1}
            ],
            M3: [
                {datetime: '2024-09-21T13:00:00.000Z', number: 1},
                {datetime: '2024-09-21T17:00:00.000Z', number: 1},
                {datetime: '2024-09-21T23:00:00.000Z', number: 2},
                {datetime: '2024-09-22T03:00:00.000Z', number: 1}
            ]
        }})
    });
    test('works for matching user to get data', async function(){
        const resp = await request(app)
            .get(`/data/meds?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&meds=${getM1Id()}&meds=${getM2Id()}&meds=${getM3Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({dataset: {
            M1: [
                {datetime: '2024-09-21T13:00:00.000Z', number: 2},
                {datetime: '2024-09-21T23:00:00.000Z', number: 1}
            ],
            M2: [
                {datetime: '2024-09-21T13:00:00.000Z', number: 1}
            ],
            M3: [
                {datetime: '2024-09-21T13:00:00.000Z', number: 1},
                {datetime: '2024-09-21T17:00:00.000Z', number: 1},
                {datetime: '2024-09-21T23:00:00.000Z', number: 2},
                {datetime: '2024-09-22T03:00:00.000Z', number: 1}
            ]
        }})
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/data/meds?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&meds=${getM1Id()}&meds=${getM2Id()}&meds=${getM3Id()}`)           
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/data/meds?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&meds=${getM1Id()}&meds=${getM2Id()}&meds=${getM3Id()}`)            
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .get(`/data/meds?userId=${getU1Id()}&startDate=2024-09-21&meds=${getM1Id()}&meds=${getM2Id()}&meds=${getM3Id()}`)            
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "endDate"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .get(`/data/meds?userId=${getU1Id()}&startDate=2024-09-21&endDate=2024-09-21&meds=tylenol`)            
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.meds[0] is not of a type(s) number');
    });
});