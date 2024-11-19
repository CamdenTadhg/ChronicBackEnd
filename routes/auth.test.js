"use strict"
process.env.NODE_ENV === "test"

const request = require("supertest");

const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterAll,
    commonAfterEach,
} = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/**POST /auth/signin */

describe("POST /auth/signin", function () {
    test('works with correct data', async function () {
        const resp = await request(app)
            .post("/auth/signin")
            .send({
                email: 'u1@test.com',
                password: "password"
            });
        expect(resp.body).toEqual({
            token: expect.any(String),
            userId: expect.any(Number)
        });
    });

    test('unauth with unfound user', async function () {
        const resp = await request(app)
            .post('/auth/signin')
            .send({
                email: "u5@test.com",
                password: 'password'
            });
        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toContain('There is no account for u5@test.com');
    });

    test('unauth with wrong password', async function () {
        const resp = await request(app)
            .post('/auth/signin')
            .send({
                email: 'u1@test.com',
                password: 'fakepassword'
            });
        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toContain('Invalid password');
    });

    test('bad request with missing data', async function () {
        const resp = await request(app)
            .post('/auth/signin')
            .send({
                password: 'password'
            });
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "email"');
    });

    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .post('/auth/signin')
            .send({
                email: 'iamnotanemail',
                password: 'password'
            });
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.email does not match pattern \"^[A-Za-z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$\"');
    });
});

/**POST /auth/register */

describe('POST /auth/register', function () {
    test('works to register', async function () {
        const resp = await request(app)
            .post('/auth/register')
            .send({
                password: 'password1!',
                name: 'New User',
                email: 'new@test.com'
            });
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            token: expect.any(String),
            userId: expect.any(Number)
        });
    });

    test('bad request with missing data', async function () {
        const resp = await request(app)
            .post('/auth/register')
            .send({
                password: 'password1!', 
                name: 'Incomplete User'
            });
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance requires property "email"');
    });

    test('bad request with invalid data', async function () {
        const resp = await request(app)
            .post('/auth/register')
            .send({
                password: 'password1!',
                name: 'Invalid User',
                email: 'iamnotanemail'
            });
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance.email does not match pattern \"^[A-Za-z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$\"');
    });

    test('bad request with duplicate email', async function(){
        const resp = await request(app)
            .post('/auth/register')
            .send({
                password: 'password1!',
                name: 'Duplicate User',
                email: 'u1@test.com',
            });
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('There is already an account');
    })
});
