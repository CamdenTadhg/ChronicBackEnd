"use strict";
process.env.NODE_ENV === "test";

const request = require("supertest");
const db = require('../db.js');
const app = require('../app');
const User = require('../models/user');
const {createToken} = require('../helpers/tokens');

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterAll,
    commonAfterEach,
    getU1Id,
    getU2Id,
    getU3Id
} = require('./_testCommon');

let u1Token, u2Token, u3Token
beforeAll(commonBeforeAll);
beforeEach(async () => {
    commonBeforeEach();
    u1Token = createToken({userId: getU1Id(), email: 'u1@test.com', isAdmin: false});
    u2Token = createToken({userId: getU2Id(), email: 'u2@test.com', isAdmin: true});
    u3Token = createToken({userId: getU3Id(), email: 'u3@test.com', isAdmin: false});
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/**POST  /users/ */


describe('POST /users/', function() {
    test('works for admin to create user', async function(){
        const resp = await request(app)
            .post('/users/')
            .send({
                email: 'new@test.com',
                password: 'password1!',
                name: 'New User', 
                isAdmin: false
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            user: {
                userId: expect.any(Number),
                email: 'new@test.com', 
                name: 'New User', 
                isAdmin: false
            }
        });
    });
    test('works for admin to create admin', async function(){
        const resp = await request(app)
            .post('/users/')
            .send({
                email: 'new2@test.com',
                password: 'password1!',
                name: 'Second New User', 
                isAdmin: true
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            user: {
                userId: expect.any(Number),
                email: 'new2@test.com', 
                name: 'Second New User', 
                isAdmin: true
            }
        });
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .post('/users/')
            .send({
                email: 'new3@test.com',
                password: 'password1!',
                name: 'New User', 
                isAdmin: false
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function (){
        const resp = await request(app)
            .post('/users/')
            .send({
                email: 'new4@test.com',
                password: 'password1!',
                name: 'New User', 
                isAdmin: false
            });
        expect(resp.statusCode).toEqual(401);
    });
    test('bad request with missing data', async function(){
        const resp = await request(app)
            .post('/users/')
            .send({
                email: 'new5@test.com',
                name: 'New User',
                isAdmin: false
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "password"');
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post('/users/')
            .send({
                email: 'new6test.com',
                password: 'password1!',
                name: 'New User',
                isAdmin: false
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.email does not match pattern \"^[A-Za-z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$\"');        
    });
    test('bad request with duplicate email', async function(){
        const resp = await request(app)
            .post('/users/')
            .send({
                email: 'u1@test.com',
                password: 'password1!',
                name: 'New User',
                isAdmin: false
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('There is already an account for u1@test.com'); 
    });
});

/**GET /users/ */

describe('GET /users/', function(){
    test('works for admin to get user list', async function(){
        const resp = await request(app)
            .get('/users/')
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            users: [
                {
                    userId: expect.any(Number),
                    email: 'u1@test.com', 
                    name: 'U1',
                    isAdmin: false,
                    registrationDate: expect.any(String), 
                    lastLogin: expect.any(String)
                },
                {
                    userId: expect.any(Number),
                    email: 'u2@test.com', 
                    name: 'U2',
                    isAdmin: false,
                    registrationDate: expect.any(String), 
                    lastLogin: expect.any(String)
                },
                {
                    userId: expect.any(Number),
                    email: 'u3@test.com', 
                    name: 'U3',
                    isAdmin: false,
                    registrationDate: expect.any(String), 
                    lastLogin: expect.any(String)
                }
            ]
        });
        for (let user of resp.body.users){
            const registrationDate = new Date(user.registrationDate);
            expect(registrationDate).toBeInstanceOf(Date);
            const lastLogin = new Date(user.lastLogin);
            expect(lastLogin).toBeInstanceOf(Date);
        }
    });
    test('forbidden for users', async function(){
        const resp = await request(app)
            .get('/users/')
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get('/users/');
        expect(resp.statusCode).toEqual(401);
    });
    test('fails: test next() handler', async function(){
        //does this route work with the error handler?
        await db.query("DROP TABLE users CASCADE");
        const resp = await request(app)
            .get("/users")
            .set("authorization", u2Token);
        expect(resp.statusCode).toEqual(500);
    });
});

/**GET /users/:userId */

describe('GET /users/:userId', function() {
    test('works for matching user', async function(){
        const resp = await request(app)
            .get(`/users/${getU1Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            user: {
                userId: getU1Id(),
                email: 'u1@test.com', 
                name: 'U1', 
                isAdmin: false,
                since: expect.any(String),
                lastLogin: expect.any(String),
                diagnoses: [
                    {
                        diagnosisId: expect.any(Number),
                        diagnosis: 'D1', 
                        keywords: ["pain"]
                    }
                ],
                symptoms: ['S1'],
                medications: [
                    {
                        medication: 'M1', 
                        dosageNum:300,
                        dosageUnit: 'mg',
                        timeOfDay: ['AM', 'PM']
                    }
                ]
            }
        });
        const lastLogin = new Date(resp.body.user.lastLogin);
        expect(lastLogin).toBeInstanceOf(Date);
        const since = new Date(resp.body.user.since);
        expect(since).toBeInstanceOf(Date);
    });
    test('works for admin', async function(){
        const resp = await request(app)
            .get(`/users/${getU1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            user: {
                userId: getU1Id(),
                email: 'u1@test.com', 
                name: 'U1', 
                isAdmin: false,
                since: expect.any(String),
                lastLogin: expect.any(String),
                diagnoses: [
                    {
                        diagnosisId: expect.any(Number),
                        diagnosis: 'D1', 
                        keywords: ["pain"]
                    }
                ],
                symptoms: ['S1'],
                medications: [
                    {
                        medication: 'M1', 
                        dosageNum:300,
                        dosageUnit: 'mg',
                        timeOfDay: ['AM', 'PM']
                    }
                ]
            }
        });
        const lastLogin = new Date(resp.body.user.lastLogin);
        expect(lastLogin).toBeInstanceOf(Date);
        const since = new Date(resp.body.user.since);
        expect(since).toBeInstanceOf(Date);
    });
    test('forbidden for other users', async function(){
        const resp = await request(app)
            .get(`/users/${getU1Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .get(`/users/${getU1Id()}`)
        expect(resp.statusCode).toEqual(401);
    });
    test('not found if user not found', async function(){
        const resp = await request(app)
            .get('/users/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such user exists');
    });
});

/**PATCH /users/:userId */

describe('PATCH /users/:userId', function(){
    test('works for matching user', async function(){
        const resp = await request(app)
            .patch(`/users/${getU1Id()}`)
            .send({
                name: 'New Name'
            })
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            user: {
                userId: getU1Id(),
                email: 'u1@test.com',
                name: 'New Name', 
                isAdmin: false
            }
        });
    });
    test('works to change password', async function(){
        const resp = await request(app)
        .patch(`/users/${getU1Id()}`)
        .send({
                password: 'newpassword1!'
            })
            .set('authorization', u1Token);
        expect(resp.body).toEqual({
            user: {
                userId: getU1Id(),
                email: 'u1@test.com',
                name: 'U1', 
                isAdmin: false
            }
        });
        const isSuccessful = await User.authenticate('u1@test.com', 'newpassword1!');
        expect(isSuccessful).toBeTruthy();
    });
    test('works for admin', async function(){
        const resp = await request(app)
            .patch(`/users/${getU1Id()}`)
            .send({
                name: 'Newer Name'
            })
            .set('authorization', u2Token);
        expect(resp.body).toEqual({
            user: {
                userId: getU1Id(),
                email: 'u1@test.com',
                name: 'Newer Name', 
                isAdmin: false
            }
        });
    });
    test('forbidden for other users', async function(){
        const resp = await request(app)
            .patch(`/users/${getU1Id()}`)
            .send({
                name: 'New Name'
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymouse', async function(){
        const resp = await request(app)
            .patch(`/users/${getU1Id()}`)
            .send({
                name: 'New Name'
            });
        expect(resp.statusCode).toEqual(401);
    });
    test('not found if user not found', async function(){
        const resp = await request(app)
            .patch('/users/0')
            .send({
                name: 'New Name'
            })
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toContain('No such user exists');
    });
    test('bad request if invalid data', async function(){
        const resp = await request(app)
            .patch(`/users/${getU1Id()}`)
            .send({
                email: 'u1test.com'
            })
            .set('authorization', u1Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.email does not match pattern \"^[A-Za-z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$\"');
    });
    test('bad request if duplicate email', async function(){
        const resp = await request(app)
            .patch(`/users/${getU3Id()}`)
            .send({
                email: 'u1@test.com'
            })
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('There is already an account');
    });
});

/**DELETE /users/:userId */

describe('DELETE /users/:userId', function(){
    test('works for matching user', async function(){
        const resp = await request(app)
            .delete(`/users/${getU1Id()}`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({deleted: getU1Id()});
    });
    test('works for admin', async function(){
        const resp = await request(app)
            .delete(`/users/${getU1Id()}`)
            .set('authorization', u2Token);
        expect(resp.body).toEqual({deleted: getU1Id()});
    });
    test('forbidden for other users', async function(){
        const resp = await request(app)
            .delete(`/users/${getU1Id()}`)
            .set('authorization', u3Token);
        expect(resp.statusCode).toEqual(403);
    });
    test('unauthorized for anonymous', async function(){
        const resp = await request(app)
            .delete(`/users/${getU1Id()}`);
        expect(resp.statusCode).toEqual(401);
    });
    test('not found if user not found', async function(){
        const resp = await request(app)
            .delete('/users/0')
            .set('authorization', u2Token);
        expect(resp.statusCode).toEqual(404);
    });
});