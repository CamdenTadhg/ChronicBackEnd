"use strict";
process.env.NODE_ENV === "test";

const request = require("supertest");
const db = require('../db.js');
const app = require('../app');
const {createToken} = require('../helpers/tokens');

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterAll,
    commonAfterEach,
    getU1Id,
    getU2Id,
    getU3Id,
    getM1Id,
    getM2Id,
    getM3Id,
    getMt1Id
} = require('./_testCommon');

let u1Token, u2Token, u3Token;
beforeAll(commonBeforeAll);
beforeEach(async () => {
    commonBeforeEach();
    u1Token = createToken({userId: getU1Id(), email: 'u1@test.com', isAdmin: false});
    u2Token = createToken({userId: getU2Id(), email: 'u2@test.com', isAdmin: true});
    u3Token = createToken({userId: getU3Id(), email: 'u3@test.com', isAdmin: false});
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

/** POST /meds/ */
describe('POST /meds/', function(){
    test('works for admin to create a medication', async function(){
        const resp = await request(app)
            .post('/meds/')
            .send({
                medicationName: 'M4',
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            medication: {
                medId: expect.any(Number),
                medication: 'M4',
            }
        });
    });
    test('forbidden for user', async function(){
        const resp = await request(app)
            .post('/meds/')
            .send({
                medicationName: 'M4',
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post('/meds/')
            .send({
                medicationName: 'M4',
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post('/meds/')
            .send({})
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "medicationName"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post('/meds/')
            .send({
                medicationName: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.medicationName is not of a type(s) string');
    });
    test('bad request with duplicate medication', async function(){
        const resp = await request(app)
            .post('/meds/')
            .send({
                medicationName: 'M1'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('M1 already exists');
    });
});

/** GET /meds */
describe('GET /meds/', function(){
    test('works for admin to get medication list', async function(){
        const resp = await request(app)
            .get('/meds/')
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            medications: [
                {
                    medId: getM1Id(),
                    medication: 'M1',
                },
                {
                    medId: getM2Id(),
                    medication: 'M2',
                },
                {
                    medId: getM3Id(),
                    medication: 'M3',
                }
            ]
        });
    });
    test('works for user to get medication list', async function(){
        const resp = await request(app)
            .get('/meds/')
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            medications: [
                {
                    medId: getM1Id(),
                    medication: 'M1',
                },
                {
                    medId: getM2Id(),
                    medication: 'M2',
                },
                {
                    medId: getM3Id(),
                    medication: 'M3',
                }
            ]
        });
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get('/meds/');
        expect(resp.statusCode).toEqual(401);
    });
    test('fails: test next() handler', async function(){
        //does this route work with the error handler?
        await db.query('DROP TABLE medications CASCADE');
        const resp = await request(app)
            .get('/meds/')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(500);
    });
});

/** GET meds/:medId */
describe('GET /meds/:medId', function(){
    test('works for admin to get medication record', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            medication: {
                medId: getM1Id(),
                medication: 'M1',
            }
        });
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}`)
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid medication', async function(){
        const resp = await request(app)
            .get('/meds/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such medication exists');
    });
});

/** PATCH meds/:medId */
describe('PATCH /meds/:medId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}`)
            .send({
                medication: 'propanalol'
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            medication: {
                medId: getM1Id(),
                medication: 'propanalol'
            }
        });
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}`)
            .send({
                medication: 'propanalol'
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}`)
            .send({
                medication: 'propanalol'
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}`)
            .send({
                medication: 1
            })
            .set('authorization', u2Token)
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.medication is not of a type(s) string');
    });
    test('not found for invalid medication', async function(){
        const resp = await request(app)
            .patch('/meds/0')
            .send({
                medication: 'propanalol'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such medication exists');
    });
});

/** DELETE meds/:medId */
describe('DELETE /meds/:medId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM2Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: getM2Id()});
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM2Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM2Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid medication', async function(){
        const resp = await request(app)
            .delete('/meds/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
    });
});


/** POST /meds/:medId/users/:userId 
 * use a 0 for the medId when creating a new medication
*/
describe('POST /meds/:medId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .post(`/meds/${getM2Id()}/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userMedication: {
                userId: getU1Id(),
                medId: getM2Id(),
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            }
        });
    });
    test('works for matching user with existing medication', async function(){
        const resp = await request(app)
            .post(`/meds/${getM2Id()}/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userMedication: {
                userId: getU1Id(),
                medId: getM2Id(), 
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            }
        });
    });
    test('works for matching user with new medication', async function(){
        const resp = await request(app)
            .post(`/meds/0/users/${getU1Id()}/`)
            .send({
                medication: 'propanalol',
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['Midday']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userMedication: {
                userId: getU1Id(),
                medId: expect.any(Number),
                dosageNum: 200,
                dosageUnit: 'mg',
                timeOfDay: ['Midday']
            }
        });
        const found = await request(app)
            .get(`/meds/${resp.body.userMedication.medId}`)
            .set('authorization', u2Token)
        expect(found).toBeTruthy();
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .post(`/meds/${getM2Id()}/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post(`/meds/0/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post(`/meds/${getM3Id()}/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "timeOfDay"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post(`/meds/0/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 3, 
                timeOfDay: ['AM', 'PM']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.dosageUnit is not of a type(s) string');
    });
    test('bad request with duplicate connection', async function(){
        const resp = await request(app)
            .post(`/meds/${getM1Id()}/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('This medication has already been assigned');
    });
    test('not found for invalid medication', async function(){
        const resp = await request(app)
            .post(`/meds/25/users/${getU1Id()}/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such medication exists');
    });
    test('not found for invalid user', async function(){
        const resp = await request(app)
            .post(`/meds/${getM1Id()}/users/0/`)
            .send({
                dosageNum: 200,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such user exists');
    });
});

/**GET /meds/:medId/users/:userId */
describe('GET /meds/:medId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            userMedication: {
                userId: getU1Id(),
                medId: getM1Id(),
                dosageNum: 300,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            }
        });
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}/users/${getU1Id()}/`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            userMedication: {
                userId: getU1Id(),
                medId: getM1Id(),
                dosageNum: 300,
                dosageUnit: 'mg', 
                timeOfDay: ['AM', 'PM']
            }
        });
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}/users/${getU1Id()}/`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}/users/${getU1Id()}/`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid userMedication', async function(){
        const resp = await request(app)
            .get(`/meds/${getM1Id()}/users/${getU3Id()}/`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('This medication is not connected to this user');
    });
});

/** PATCH /meds/:medId/users/:userId */
describe('PATCH /meds/:medId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .send({
                newMedId: getM2Id(),
                dosageNum: 200,
                dosageUnit: 'UI', 
                timeOfDay: ['Midday']
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            userMed: {
                userId: getU1Id(),
                medId: getM2Id(),
                dosageNum: 200,
                dosageUnit: 'UI', 
                timeOfDay: ['Midday']
            }
        });
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .send({
                dosageNum: 200,
                dosageUnit: 'UI', 
                timeOfDay: ['Midday']
            })
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            userMed: {
                userId: getU1Id(),
                medId: getM1Id(),
                dosageNum: 200,
                dosageUnit: 'UI',
                timeOfDay: ['Midday']
            }
        });
    });
    test('works for matching user with new medication', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .send({
                medication: 'propanolol',
                dosageNum: 200,
                dosageUnit: 'UI',
                timeOfDay: ['Midday']
            })
            .set('authorization', u1Token);
        const newMedId = (await db.query(`SELECT med_id AS "medId" FROM medications WHERE medication = 'propanolol'`)).rows[0].medId;
        expect(resp.body).toEqual({
            userMed: {
                userId: getU1Id(),
                medId: newMedId,
                dosageNum: 200,
                dosageUnit: 'UI',
                timeOfDay: ['Midday']
            }
        });
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .send({
                dosageNum: 200,
                dosageUnit: 'UI', 
                timeOfDay: ['Midday']
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .send({
                dosageNum: 200,
                dosageUnit: 'UI', 
                timeOfDay: ['Midday']
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM2Id()}/users/${getU2Id()}`)
            .send({
                newMedId: getM1Id(),
                dosageUnit: 'UI', 
                timeOfDay: ['Midday']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "dosageNum"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM2Id()}/users/${getU2Id()}`)
            .send({
                newMedId: 'lethargy',
                dosageNum: 200,
                dosageUnit: 'mg',
                timeOfDay: ['AM']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.newMedId is not of a type(s) number');
    });
    test('not found for invalid userMedication', async function(){
        const resp = await request(app)
            .patch(`/meds/${getM1Id()}/users/${getU3Id()}`)
            .send({
                dosageNum: 200,
                dosageUnit: 'UI', 
                timeOfDay: ['Midday']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('This medication is not connected to this user');
    });
});

/**DELETE /meds/:medId/users/:userId */
describe('DELETE /meds/:medId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: [`User ${getU1Id()}`, `Medication ${getM1Id()}`]});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({deleted: [`User ${getU1Id()}`, `Medication ${getM1Id()}`]});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM1Id()}/users/${getU1Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM1Id()}/users/${getU1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid userMedication', async function(){
        const resp = await request(app)
            .delete(`/meds/${getM1Id()}/users/${getU3Id()}`)
            .set('authorization', u2Token)
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('This medication is not connected to this user');
    });
});

/** POST /meds/users/:userId/tracking */
describe('POST /meds/users/:userId/tracking', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU1Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-24',
                timeOfDay: 'AM',
                number: 3
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            trackingRecord: {
                medtrackId: expect.any(Number),
                userId: getU1Id(),
                medId: getM1Id(),
                trackDate: expect.any(String), 
                timeOfDay: 'AM', 
                dataTimestamp: expect.any(String),
                number: 3,
                trackedAt: expect.any(String)
            }
        });
        const trackedAt = new Date(resp.body.trackingRecord.trackedAt);
        expect(trackedAt).toBeInstanceOf(Date);
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-24T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-24T13:00:00.000Z');
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU1Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-24',
                timeOfDay: 'PM',
                number: 1
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            trackingRecord: {
                medtrackId: expect.any(Number),
                userId: getU1Id(),
                medId: getM1Id(),
                trackDate: expect.any(String), 
                timeOfDay: 'PM', 
                dataTimestamp: expect.any(String),
                number: 1,
                trackedAt: expect.any(String)
            }
        });
        const trackedAt = new Date(resp.body.trackingRecord.trackedAt);
        expect(trackedAt).toBeInstanceOf(Date);
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-24T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-24T23:00:00.000Z');
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU1Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-24',
                timeOfDay: 'PM',
                number: 1
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU1Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-24',
                timeOfDay: 'PM',
                number: 1
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU1Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-24',
                number: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "timeOfDay"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU1Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-24',
                timeOfDay: 'Morning',
                number: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.timeOfDay is not one of enum values: AM,Midday,PM,Evening');
    });
    test('bad request with duplicate tracking record', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU1Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-21',
                timeOfDay: 'AM',
                number: 4
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('That tracking record already exists');
    });
    test('not found for invalid userMedication', async function(){
        const resp = await request(app)
            .post(`/meds/users/${getU3Id()}/tracking`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-24',
                timeOfDay: 'PM',
                number: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('That medication is not associated with that user');
    });
});

/** GET /meds/users/:userId/tracking */
describe('GET /meds/users/:userId/tracking', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            trackingRecords: [
                {
                    medtrackId: expect.any(Number),
                    userId: getU1Id(),
                    medication: "M1",
                    trackDate: expect.any(String),
                    timeOfDay: 'AM',
                    dataTimestamp: expect.any(String),
                    number: 2,
                },
                {
                    medtrackId: expect.any(Number),
                    userId: getU1Id(),
                    medication: "M1",
                    trackDate: expect.any(String),
                    timeOfDay: 'PM',
                    dataTimestamp: expect.any(String),
                    number: 1,
                }
            ]      
        });
        for (let record of resp.body.trackingRecords){
            const trackDate = new Date(record.trackDate);
            expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
            const dataTimestamp = new Date(record.dataTimestamp);
            expect(dataTimestamp).toBeInstanceOf(Date);
        }
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            trackingRecords: [
                {
                    medtrackId: expect.any(Number),
                    userId: getU1Id(),
                    medication: "M1",
                    trackDate: expect.any(String),
                    timeOfDay: 'AM',
                    dataTimestamp: expect.any(String),
                    number: 2,
                },
                {
                    medtrackId: expect.any(Number),
                    userId: getU1Id(),
                    medication: "M1",
                    trackDate: expect.any(String),
                    timeOfDay: 'PM',
                    dataTimestamp: expect.any(String),
                    number: 1,
                }
            ] 
        });
        for (let record of resp.body.trackingRecords){
            const trackDate = new Date(record.trackDate);
            expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
            const dataTimestamp = new Date(record.dataTimestamp);
            expect(dataTimestamp).toBeInstanceOf(Date);
        }
    });
    test('returns empty array if no tracking data', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU2Id()}/tracking`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({trackingRecords: []});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking`)
        expect(resp.statusCode).toEqual(401);
    });
});

/** GET /meds/users/:userId/tracking/:medtrackId */
describe('GET /meds/users/:userId/tracking/:medtrackId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .set('authorization', u2Token)
        expect(resp.body).toEqual({
            trackingRecord: {
                medtrackId: getMt1Id(),
                userId: getU1Id(),
                medId: getM1Id(),
                trackDate: expect.any(String), 
                timeOfDay: 'AM', 
                dataTimestamp: expect.any(String),
                number: 2,
            }
        });
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T13:00:00.000Z');
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .set('authorization', u1Token)
        expect(resp.body).toEqual({
            trackingRecord: {
                medtrackId: getMt1Id(),
                userId: getU1Id(),
                medId: getM1Id(),
                trackDate: expect.any(String), 
                timeOfDay: 'AM', 
                dataTimestamp: expect.any(String),
                number: 2,
            }
        });
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T13:00:00.000Z');
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .set('authorization', u3Token)
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid tracking record', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/tracking/0`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking record exists');
    });
});

/** GET /meds/users/:userId/trackingbydate/:date */
describe('GET /meds/users/:userId/trackingbydate/:date', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            trackingRecords: {
                AM: {
                    M1: 2
                },
                Midday: {},
                PM: {
                    M1: 1
                },
                Evening: {}
            }
        });
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            trackingRecords: {
                AM: {
                    M1: 2
                },
                Midday: {},
                PM: {
                    M1: 1
                },
                Evening: {}
            }
        });
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
        expect(resp.statusCode).toEqual(401);
    });
    test('returns empty object if no tracking data', async function(){
        const resp = await request(app)
            .get(`/meds/users/${getU1Id()}/trackingbydate/2024-04-13`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({trackingRecords: {
            AM: {
                M1: null
            },
            Midday: {},
            PM: {
                M1: null
            },
            Evening: {}
        }});
    });
});

/** PATCH /meds/users/:userId/tracking/:medtrackId */
describe('PATCH /meds/users/:userId/tracking/:medtrackId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-21',
                timeOfDay: 'AM',
                number: 5
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            trackingRecord: {
                medtrackId: getMt1Id(),
                userId: getU1Id(),
                medId: getM1Id(),
                trackDate: expect.any(String),
                timeOfDay: 'AM', 
                dataTimestamp: expect.any(String),
                number: 5,
                trackedAt: expect.any(String)
            }
        });
        const trackedAt = new Date(resp.body.trackingRecord.trackedAt);
        expect(trackedAt).toBeInstanceOf(Date);
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T13:00:00.000Z');
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .patch(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-21',
                timeOfDay: 'AM',
                number: 4
            })
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            trackingRecord: {
                medtrackId: getMt1Id(),
                userId: getU1Id(),
                medId: getM1Id(),
                trackDate: expect.any(String),
                timeOfDay: 'AM', 
                dataTimestamp: expect.any(String),
                number: 4,
                trackedAt: expect.any(String)
            }
        });
        const trackedAt = new Date(resp.body.trackingRecord.trackedAt);
        expect(trackedAt).toBeInstanceOf(Date);
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T13:00:00.000Z');
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .patch(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-21',
                timeOfDay: 'AM',
                number: 4
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-21',
                timeOfDay: 'AM',
                number: 4
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .patch(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .send({})
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "number"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-09-21',
                timeOfDay: 'AM',
                number: '2024-09-22'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.number is not of a type(s) number');
    });
    test('not found for invalid tracking record', async function(){
        const resp = await request(app)
            .patch(`/meds/users/${getU1Id()}/tracking/0`)
            .send({
                medId: getM1Id(),
                trackDate: '2024-04-21',
                timeOfDay: 'AM',
                number: 4
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking record exists');
    });
});

/** DELETE /meds/users/:userId/tracking/:medtrackId */
describe('DELETE /meds/users/:userId/tracking/:medtrackId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: getMt1Id()});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({deleted: getMt1Id()});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/tracking/${getMt1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid tracking record', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/tracking/0`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking record exists');
    });
});

/** DELETE /meds/users/:userId/trackingbydate/:date */
describe('DELETE /meds/users/:userId/trackingbydate/:date', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: '2024-09-21'});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({deleted: '2024-09-21'});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/trackingbydate/2024-09-21`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid tracking records', async function(){
        const resp = await request(app)
            .delete(`/meds/users/${getU1Id()}/trackingbydate/2024-04-13`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking records exist');
    });
});
