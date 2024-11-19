"use strict";
process.env.NODE_ENV === "test";

const request = require("supertest");
const db = require('../db.js');
const app = require('../app');
const Symptom = require('../models/symptom');
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
    getSt1Id
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

/** POST /symptoms/ */
describe('POST /symptoms/', function(){
    test('works for admin to create a symptom', async function(){
        const resp = await request(app)
            .post('/symptoms/')
            .send({
                symptomName: 'S4',
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            symptom: {
                symptomId: expect.any(Number),
                symptom: 'S4',
            }
        });
    });
    test('forbidden for user', async function(){
        const resp = await request(app)
            .post('/symptoms/')
            .send({
                symptomName: 'S4',
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post('/symptoms/')
            .send({
                symptomName: 'S4',
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post('/symptoms/')
            .send({})
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "symptomName"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post('/symptoms/')
            .send({
                symptomName: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.symptomName is not of a type(s) string');
    });
    test('bad request with duplicate symptom', async function(){
        const resp = await request(app)
            .post('/symptoms/')
            .send({
                symptomName: 'S1'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('S1 already exists');
    });
});

/** GET /symptoms */
describe('GET /symptoms/', function(){
    test('works for admin to get symptom list', async function(){
        const resp = await request(app)
            .get('/symptoms/')
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            symptoms: [
                {
                    symptomId: getS1Id(),
                    symptom: 'S1',
                },
                {
                    symptomId: getS2Id(),
                    symptom: 'S2',
                },
                {
                    symptomId: getS3Id(),
                    symptom: 'S3',
                }
            ]
        });
    });
    test('works for user to get symptom list', async function(){
        const resp = await request(app)
            .get('/symptoms/')
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            symptoms: [
                {
                    symptomId: getS1Id(),
                    symptom: 'S1',
                },
                {
                    symptomId: getS2Id(),
                    symptom: 'S2',
                },
                {
                    symptomId: getS3Id(),
                    symptom: 'S3',
                }
            ]
        });
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get('/symptoms/');
        expect(resp.statusCode).toEqual(401);
    });
    test('fails: test next() handler', async function(){
        //does this route work with the error handler?
        await db.query('DROP TABLE symptoms CASCADE');
        const resp = await request(app)
            .get('/symptoms/')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(500);
    });
});

/** GET symptoms/:symptomId */
describe('GET /symptoms/:symptomId', function(){
    test('works for admin to get symptom record', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            symptom: {
                symptomId: getS1Id(),
                symptom: 'S1',
            }
        });
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}`)
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid symptom', async function(){
        const resp = await request(app)
            .get('/symptoms/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such symptom exists');
    });
});

/** PATCH symptoms/:symptomId */
describe('PATCH /symptoms/:symptomId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}`)
            .send({
                symptom: 'naseau'
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            symptom: {
                symptomId: getS1Id(),
                symptom: 'naseau'
            }
        });
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}`)
            .send({
                symptom: 'naseau'
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}`)
            .send({
                symptom: 'naseau'
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}`)
            .send({
                symptom: 1
            })
            .set('authorization', u2Token)
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.symptom is not of a type(s) string');
    });
    test('not found for invalid symptom', async function(){
        const resp = await request(app)
            .patch('/symptoms/0')
            .send({
                symptom: 'naseau'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such symptom exists');
    });
});

/** DELETE symptoms/:symptomId */
describe('DELETE /symptoms/:symptomId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS2Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: getS2Id()});
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS2Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS2Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid symptom', async function(){
        const resp = await request(app)
            .delete('/symptoms/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
    });
});


/** POST /symptoms/:symptomId/users/:userId 
 * use a 0 for the symptomId when creating a new symptom
*/
describe('POST /symptoms/:symptomId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .post(`/symptoms/${getS2Id()}/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userSymptom: {
                userId: getU1Id(),
                symptomId: getS2Id()
            }
        });
    });
    test('works for matching user with existing symptom', async function(){
        const resp = await request(app)
            .post(`/symptoms/${getS2Id()}/users/${getU1Id()}/`)
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userSymptom: {
                userId: getU1Id(),
                symptomId: getS2Id()
            }
        });
    });
    test('works for matching user with new symptom', async function(){
        const resp = await request(app)
            .post(`/symptoms/0/users/${getU1Id()}/`)
            .send({
                symptom: 'lethargy'
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userSymptom: {
                userId: getU1Id(),
                symptomId: expect.any(Number)
            }
        });
        const found = await request(app)
            .get(`/symptoms/${resp.body.userSymptom.symptomId}`)
            .set('authorization', u2Token)
        expect(found).toBeTruthy();
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .post(`/symptoms/${getS2Id()}/users/${getU1Id()}/`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post(`/symptoms/0/users/${getU1Id()}/`)
            .send({
                symptom: 'lethargy'
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post(`/symptoms/0/users/${getU1Id()}/`)
            .send({})
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "symptom"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post(`/symptoms/0/users/${getU1Id()}/`)
            .send({
                symptom: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.symptom is not of a type(s) string');
    });
    test('bad request with duplicate connection', async function(){
        const resp = await request(app)
            .post(`/symptoms/${getS1Id()}/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('This symptom has already been assigned');
    });
    test('not found for invalid symptom', async function(){
        const resp = await request(app)
            .post(`/symptoms/1/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such symptom exists');
    });
    test('not found for invalid user', async function(){
        const resp = await request(app)
            .post(`/symptoms/${getS1Id()}/users/0/`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such user exists');
    });
});

/**GET /symptoms/:symptomId/users/:userId */
describe('GET /symptoms/:symptomId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            userSymptom: {
                userId: getU1Id(),
                symptomId: getS1Id()
            }
        });
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}/users/${getU1Id()}/`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            userSymptom: {
                userId: getU1Id(),
                symptomId: getS1Id()
            }
        });
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}/users/${getU1Id()}/`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}/users/${getU1Id()}/`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid userSymptom', async function(){
        const resp = await request(app)
            .get(`/symptoms/${getS1Id()}/users/${getU3Id()}/`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such userSymptom exists');
    });
});

/** PATCH /symptoms/:symptomId/users/:userId */
describe('PATCH /symptoms/:symptomId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
            .send({
                newSymptomId: getS2Id()
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            userSymptom: {
                userId: getU1Id(),
                symptomId: getS2Id()
            }
        });
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
            .send({
                newSymptomId: getS3Id()
            })
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            userSymptom: {
                userId: getU1Id(),
                symptomId: getS3Id()
            }
        });
    });
    test('works for matching user with new symptom', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
            .send({
                symptom: 'dizziness'
            })
            .set('authorization', u1Token);
        const newSymptomId = (await db.query(`SELECT symptom_id AS "symptomId" FROM symptoms WHERE symptom = 'dizziness'`)).rows[0].symptomId;
        expect(resp.body).toEqual({
            userSymptom: {
            userId: getU1Id(),
            symptomId: newSymptomId
        }});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
            .send({
                newSymptomId: getS3Id()
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}/users/${getS1Id()}`)
            .send({
                newSymptomId: getS3Id()
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS2Id()}/users/${getU2Id()}`)
            .send({})
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "newSymptomId"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS2Id()}/users/${getU2Id()}`)
            .send({
                newSymptomId: 'lethargy'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.newSymptomId is not of a type(s) number');
    });
    test('not found for invalid userSymptom', async function(){
        const resp = await request(app)
            .patch(`/symptoms/${getS1Id()}/users/${getU3Id()}`)
            .send({
                newSymptomId: getS2Id()
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such userSymptom exists');
    });
});

/**DELETE /symptoms/:symptomId/users/:userId */
describe('DELETE /symptoms/:symptomId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({disconnected: [`User ${getU1Id()}`, `Symptom ${getS1Id()}`]});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({disconnected: [`User ${getU1Id()}`, `Symptom ${getS1Id()}`]});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS1Id()}/users/${getU1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid userSymptom', async function(){
        const resp = await request(app)
            .delete(`/symptoms/${getS1Id()}/users/${getU3Id()}`)
            .set('authorization', u2Token)
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such userSymptom exists');
    });
});

/** POST /symptoms/users/:userId/tracking */
describe('POST /symptoms/users/:userId/tracking', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU1Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-24',
                timespan: '12-4 AM',
                severity: 3
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            trackingRecord: {
                symtrackId: expect.any(Number),
                userId: getU1Id(),
                symptomId: getS1Id(),
                trackDate: expect.any(String), 
                timespan: '12-4 AM', 
                dataTimestamp: expect.any(String),
                severity: 3,
                trackedAt: expect.any(String)
            }
        });
        const trackedAt = new Date(resp.body.trackingRecord.trackedAt);
        expect(trackedAt).toBeInstanceOf(Date);
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-24T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-24T05:00:00.000Z');
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU1Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-24',
                timespan: '8 AM-12 PM',
                severity: 1
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            trackingRecord: {
                symtrackId: expect.any(Number),
                userId: getU1Id(),
                symptomId: getS1Id(),
                trackDate: expect.any(String), 
                timespan: '8 AM-12 PM', 
                dataTimestamp: expect.any(String),
                severity: 1,
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
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU1Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-24',
                timespan: '12-4 PM',
                severity: 1
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU1Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-24',
                timespan: '12-4 PM',
                severity: 1
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU1Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-24',
                severity: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "timespan"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU1Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-24',
                timespan: '12-8 PM',
                severity: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.timespan is not one of enum values: 12-4 AM,4-8 AM,8 AM-12 PM,12-4 PM,4-8 PM,8 PM-12 AM');
    });
    test('bad request with duplicate tracking record', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU1Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-21',
                timespan: '12-4 AM',
                severity: 4
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('That tracking record already exists');
    });
    test('not found for invalid userSymptom', async function(){
        const resp = await request(app)
            .post(`/symptoms/users/${getU3Id()}/tracking`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-24',
                timespan: '12-4 PM',
                severity: 1
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('That symptom is not associated with that user');
    });
});

/** GET /symptoms/users/:userId/tracking */
describe('GET /symptoms/users/:userId/tracking', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            trackingRecords: [
                {
                    symtrackId: expect.any(Number),
                    userId: getU1Id(),
                    symptom: "S1",
                    trackDate: expect.any(String),
                    timespan: '12-4 AM',
                    dataTimestamp: expect.any(String),
                    severity: 3,
                },
                {
                    symtrackId: expect.any(Number),
                    userId: getU1Id(),
                    symptom: 'S1',
                    trackDate: expect.any(String),
                    timespan: '8 AM-12 PM',
                    dataTimestamp: expect.any(String),
                    severity: 2,
                },
                {
                    symtrackId: expect.any(Number),
                    userId: getU1Id(),
                    symptom: 'S1', 
                    trackDate: expect.any(String),
                    timespan: '12-4 PM',
                    dataTimestamp: expect.any(String),
                    severity: 1,
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
            .get(`/symptoms/users/${getU1Id()}/tracking`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            trackingRecords: [
                {
                    symtrackId: expect.any(Number),
                    userId: getU1Id(),
                    symptom: 'S1', 
                    trackDate: expect.any(String),
                    timespan: '12-4 AM',
                    dataTimestamp: expect.any(String),
                    severity: 3,
                },
                {
                    symtrackId: expect.any(Number),
                    userId: getU1Id(),
                    symptom: 'S1', 
                    trackDate: expect.any(String),
                    timespan: '8 AM-12 PM',
                    dataTimestamp: expect.any(String),
                    severity: 2,
                },
                {
                    symtrackId: expect.any(Number),
                    userId: getU1Id(),
                    symptom: 'S1',
                    trackDate: expect.any(String),
                    timespan: '12-4 PM',
                    dataTimestamp: expect.any(String),
                    severity: 1,
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
            .get(`/symptoms/users/${getU3Id()}/tracking`)
            .set('authorization', u3Token);
        expect(resp.body).toEqual({trackingRecords: []});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking`)
        expect(resp.statusCode).toEqual(401);
    });
});

/** GET /symptoms/users/:userId/tracking/:symtrackId */
describe('GET /symptoms/users/:userId/tracking/:symtrackId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .set('authorization', u2Token)
        expect(resp.body).toEqual({
            trackingRecord: {
                symtrackId: getSt1Id(),
                userId: getU1Id(),
                symptomId: getS1Id(),
                trackDate: expect.any(String), 
                timespan: '12-4 AM', 
                dataTimestamp: expect.any(String),
                severity: 3,
            }
        });
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T05:00:00.000Z');
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .set('authorization', u1Token)
        expect(resp.body).toEqual({
            trackingRecord: {
                symtrackId: getSt1Id(),
                userId: getU1Id(),
                symptomId: getS1Id(),
                trackDate: expect.any(String), 
                timespan: '12-4 AM', 
                dataTimestamp: expect.any(String),
                severity: 3,
            }
        });
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T05:00:00.000Z');
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .set('authorization', u3Token)
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid tracking record', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/tracking/0`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking record exists');
    });
});

/** GET /symptoms/users/:userId/trackingbydate/:date */
describe('GET /symptoms/users/:userId/trackingbydate/:date', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            trackingRecords: {
                S1: {
                    '12-4 AM': 3,
                    '8 AM-12 PM': 2,
                    '12-4 PM': 1
                }
            }
        });
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            trackingRecords: {
                'S1': {
                    '12-4 AM': 3,
                    '8 AM-12 PM': 2,
                    '12-4 PM': 1
                }
            }
        });
    });

    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
        expect(resp.statusCode).toEqual(401);
    });
    test('returns empty object if no tracking data', async function(){
        const resp = await request(app)
            .get(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-22`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({trackingRecords: {
            'S1': {}
        }});
    });
});

/** PATCH /symptoms/users/:userId/tracking/:symtrackId */
describe('PATCH /symptoms/users/:userId/tracking/:symtrackId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-21',
                timespan: '12-4 AM',
                severity: 5
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            trackingRecord: {
                symtrackId: getSt1Id(),
                userId: getU1Id(),
                symptomId: getS1Id(),
                trackDate: expect.any(String),
                timespan: '12-4 AM', 
                dataTimestamp: expect.any(String),
                severity: 5,
                trackedAt: expect.any(String)
            }
        });
        const trackedAt = new Date(resp.body.trackingRecord.trackedAt);
        expect(trackedAt).toBeInstanceOf(Date);
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T05:00:00.000Z');
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .patch(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-21',
                timespan: '12-4 AM',
                severity: 4
            })
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            trackingRecord: {
                symtrackId: getSt1Id(),
                userId: getU1Id(),
                symptomId: getS1Id(),
                trackDate: expect.any(String),
                timespan: '12-4 AM',
                dataTimestamp: expect.any(String), 
                severity: 4,
                trackedAt: expect.any(String)
            }
        });
        const trackedAt = new Date(resp.body.trackingRecord.trackedAt);
        expect(trackedAt).toBeInstanceOf(Date);
        const trackDate = new Date(resp.body.trackingRecord.trackDate);
        expect.toBeCorrectTimestamp(trackDate, '2024-09-21T05:00:00.000Z');
        const dataTimestamp = new Date(resp.body.trackingRecord.dataTimestamp);
        expect.toBeCorrectTimestamp(dataTimestamp, '2024-09-21T05:00:00.000Z');
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .patch(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-21',
                timespan: '12-4 AM',
                severity: 5
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-21',
                timespan: '12-4 AM',
                severity: 5
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .patch(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-21',
                timespan: '12-4 AM'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "severity"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-09-21',
                timespan: '12-4 AM',
                severity: '2024-09-25'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.severity is not of a type(s) number');
    });
    test('not found for invalid tracking record', async function(){
        const resp = await request(app)
            .patch(`/symptoms/users/${getU1Id()}/tracking/0`)
            .send({
                symptomId: getS1Id(),
                trackDate: '2024-10-13',
                timespan: '12-4 AM',
                severity: 5
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking record exists');
    });
});

/** DELETE /symptoms/users/:userId/tracking/:symtrackId */
describe('DELETE /symptoms/users/:userId/tracking/:symtrackId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: getSt1Id()});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({deleted: getSt1Id()});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/tracking/${getSt1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid tracking record', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/tracking/0`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking record exists');
    });
});

/** DELETE /symptoms/users/:userId/trackingbydate/:date */
describe('DELETE /symptoms/users/:userId/trackingbydate/:date', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: '2024-09-21'});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({deleted: '2024-09-21'});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/trackingbydate/2024-09-21`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid tracking records', async function(){
        const resp = await request(app)
            .delete(`/symptoms/users/${getU1Id()}/trackingbydate/2024-04-13`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such tracking records exist');
    });
});
