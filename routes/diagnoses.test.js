"use strict";
process.env.NODE_ENV === "test";

const request = require("supertest");
const db = require('../db.js');
const app = require('../app');
const Diagnosis = require('../models/diagnosis');
const {createToken} = require('../helpers/tokens');

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterAll,
    commonAfterEach,
    getU1Id,
    getU2Id, 
    getU3Id,
    getD1Id, 
    getD2Id,
    getD3Id
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

/** POST /diagnoses/ */

describe('POST /diagnoses/', function(){
    test('works for admin to create diagnosis', async function(){
        const resp = await request(app)
            .post('/diagnoses/')
            .send({
                diagnosisName: 'D4',
                synonyms: ['D4 disorder']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            diagnosis: {
                diagnosisId: expect.any(Number),
                diagnosis: 'D4',
                synonyms: ['D4 disorder']
            }
        });
    });
    test('forbidden for user', async function(){
        const resp = await request(app)
            .post('/diagnoses/')
            .send({
                diagnosisName: 'D4',
                synonyms: ['D4 disorder']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post('/diagnoses/')
            .send({
                diagnosisName: 'D4',
                synonyms: ['D4 disorder']
            });
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function (){
        const resp = await request(app)
            .post('/diagnoses/')
            .send({
                diagnosisName: 'D4'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "synonyms"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post('/diagnoses/')
            .send({
                diagnosisName: 'D4',
                synonyms: 'D4 disorder'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.synonyms is not of a type(s) array');
    });
    test('bad request with duplicate diagnosis', async function(){
        const resp = await request(app)
            .post('/diagnoses/')
            .send({
                diagnosisName: 'D1', 
                synonyms: ['D1 disorder']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('Did you mean D1?');
    });
    test('bad request with existing synonym', async function(){
        const resp = await request(app)
            .post('/diagnoses/')
            .send({
                diagnosisName: 'D5', 
                synonyms: ['d3']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('Did you mean D3?');
    });
});

/**GET /diagnoses/ */

describe('GET /diagnoses/', function(){
    test('works for admin to get diagnoses list', async function(){
        const resp = await request(app)
            .get('/diagnoses/')
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            diagnoses: [
                {
                    diagnosisId: expect.any(Number),
                    diagnosis: 'D1',
                    synonyms: ['d1', 'disease']
                },
                {
                    diagnosisId: expect.any(Number),
                    diagnosis: 'D2',
                    synonyms: []
                },
                {
                    diagnosisId: expect.any(Number),
                    diagnosis: 'D3',
                    synonyms: ['d3']
                }
            ]
        });
    });
    test('works for user to get diagnoses list', async function(){
        const resp = await request(app)
            .get('/diagnoses/')
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            diagnoses: [
                {
                    diagnosisId: expect.any(Number),
                    diagnosis: 'D1',
                    synonyms: ['d1', 'disease']
                },
                {
                    diagnosisId: expect.any(Number),
                    diagnosis: 'D2',
                    synonyms: []
                },
                {
                    diagnosisId: expect.any(Number),
                    diagnosis: 'D3',
                    synonyms: ['d3']
                }
            ]
        });
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get('/diagnoses/');
        expect(resp.statusCode).toEqual(401);
    });
    test('fails: test next() handler', async function(){
        //does this route work with the error handler?
        await db.query("DROP TABLE diagnoses CASCADE");
        const resp = await request(app)
            .get("/diagnoses")
            .set("authorization", u2Token);
        expect(resp.statusCode).toEqual(500);
    });
});

/**GET /diagnoses/:diagnosisId */

describe('GET /diagnoses/:diagnosisId', function(){
    test('works for admin to get diagnosis record', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            diagnosis: {
                diagnosisId: getD1Id(),
                diagnosis: 'D1',
                synonyms: ['d1', 'disease']
            }
        });
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}`)
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid diagnosis', async function(){
        const resp = await request(app)
            .get('/diagnoses/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such diagnosis exists');
    });
});

/**PATCH diagnoses/:diagnosisId */

describe('PATCH /diagnoses/:diagnosisId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}`)
            .send({
                diagnosis: 'D1 disorder',
                synonyms: ['D1 syndrome']
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            diagnosis: {
                diagnosisId: getD1Id(),
                diagnosis: 'D1 disorder',
                synonyms: ['d1', 'disease', 'D1 syndrome']
            }
        });
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}`)
            .send({
                synonyms: ['D1 syndrome']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}`)
            .send({
                synonyms: ['D1 syndrome']
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}`)
            .send({
                synonyms: 'D1 disorder'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.synonyms is not of a type(s) array')
    })
    test('not found for invalid diagnosis', async function(){
        const resp = await request(app)
            .patch('/diagnoses/0')
            .send({
                synonyms: ['D1 syndrome']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such diagnosis exists');
    });
});

/**DELETE diagnoses/:diagnosisId */

describe('DELETE /diagnoses/:diagnosisId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/${getD2Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: getD2Id()});
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/${getD2Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/${getD2Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid diagnosis', async function(){
        const resp = await request(app)
            .delete('/diagnoses/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
    });
});

/**POST diagnoses/:diagnosisId/users/:userId
 * use a 0 for the diagnosisId when creating a new diagnosis
*/

describe('POST /diagnoses/:diagnosisId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD2Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['pain', 'fatigue']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userDiagnosis: {
                userId: getU1Id(),
                diagnosisId: getD2Id(),
                keywords: ['pain', 'fatigue']
            }
        });
    });
    test('works for matching user with existing diagnosis', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD3Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['pain', 'fatigue']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userDiagnosis: {
                userId: getU1Id(),
                diagnosisId: getD3Id(),
                keywords: ['pain', 'fatigue']
            }
        });
    });
    test('works for matching user with new diagnosis', async function(){
        const resp = await request(app)
            .post(`/diagnoses/0/users/${getU1Id()}/`)
            .send({
                diagnosis: 'Mast Cell Activation Syndrome',
                synonyms: ['MCAS'],
                keywords: ['allergy']
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            userDiagnosis: {
                userId: getU1Id(),
                diagnosisId: expect.any(Number),
                keywords: ['allergy']
            }
        });
        const found = await request(app)
            .get(`/diagnoses/${resp.body.userDiagnosis.diagnosisId}`)
            .set('authorization', u2Token)
        expect(found).toBeTruthy();
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD3Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['allergy']
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD3Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['allergy']
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD3Id()}/users/${getU1Id()}/`)
            .send({})
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "keywords"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD3Id()}/users/${getU1Id()}/`)
            .send({
                keywords: 'lethargy'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.keywords is not of a type(s) array');
    });
    test('bad request with duplicate connection', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['lethargy']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('This diagnosis has already been assigned to this user');
    });
    test('not found for invalid diagnosis', async function(){
        const resp = await request(app)
            .post(`/diagnoses/1/users/${getU1Id()}/`)
            .send({
                keywords: ['lethargy']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such diagnosis exists');
    });
    test('not found for invalid user', async function(){
        const resp = await request(app)
            .post(`/diagnoses/${getD1Id()}/users/0/`)
            .send({
                keywords: ['lethargy']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such user exists');
    });
});

/**GET diagnoses/:diagnosisId/users/:userId */
describe('GET diagnoses/:diagnosisId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            userDiagnosis: {
                userId: getU1Id(),
                diagnosisId: getD1Id(),
                keywords: ['pain']
    }});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            userDiagnosis: {
                userId: getU1Id(),
                diagnosisId: getD1Id(),
                keywords: ['pain']
        }});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
        expect(resp.statusCode).toEqual(401);
    });
    test('notfound for invalid userDiagnosis', async function(){
        const resp = await request(app)
            .get(`/diagnoses/${getD1Id()}/users/${getU2Id()}`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such userDiagnosis exists');
    });
});

/**PATCH diagnoses/:diagnosisId/users/:userId */

describe('PATCH /diagnosis/:diagnosisId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['lethargy']
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            userDiagnosis: {
                userId: getU1Id(),
                diagnosisId: getD1Id(),
                keywords: ['pain', 'lethargy']
        }});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD3Id()}/users/${getU3Id()}/`)
            .send({
                keywords: ['lethargy']
            })
            .set('authorization', u3Token);
        expect(resp.body).toEqual({
            userDiagnosis: {
                userId: getU3Id(),
                diagnosisId: getD3Id(),
                keywords: ['fatigue', 'long covid', 'lethargy']
        }});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['allergy']
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['allergy']
            })
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .send({})
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "keywords"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .send({
                keywords: 'lethargy'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.keywords is not of a type(s) array');
    });
    test('not found for invalid user diagnosis', async function(){
        const resp = await request(app)
            .patch(`/diagnoses/${getD3Id()}/users/${getU1Id()}/`)
            .send({
                keywords: ['lethargy']
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such userDiagnosis exists');
    });
});

/**DELETE diagnoses/:diagnosisId/users/:userId */

describe('DELETE /diagnosis/:diagnosisId/users/:userId', function(){
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({disconnected: [`User ${getU1Id()}`, `Diagnosis ${getD1Id()}`]});
    });
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/${getD3Id()}/users/${getU3Id()}/`)
            .set('authorization', u3Token);
        expect(resp.body).toEqual({disconnected: [`User ${getU3Id()}`, `Diagnosis ${getD3Id()}`]});
    });
    test('forbidden for non-matching user', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/${getD1Id()}/users/${getU1Id()}/`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found for invalid user diagnosis', async function(){
        const resp = await request(app)
            .delete(`/diagnoses/0/users/${getU1Id()}/`)
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such userDiagnosis exists');
    });
});