"use strict";
process.env.NODE_ENV === "test";

const request = require("supertest");
const db = require('../db.js');
const app = require('../app.js');
const Diagnosis = require('./diagnosis');
const {NotFoundError, BadRequestError} = require('../expressError')

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterAll,
    commonAfterEach,
    u1Token,
    u2Token,
    u3Token
} = require('./_testCommon.js');

let d1Id, d2Id, d3Id, u2Id, u1Id;
beforeAll(commonBeforeAll);
beforeEach(async () => {
    commonBeforeEach();
    const diagnosisId1Result = await db.query(`SELECT diagnosis_id AS "diagnosisId" FROM diagnoses WHERE diagnosis = 'D1'`);
    d1Id = diagnosisId1Result.rows[0].diagnosisId;
    const diagnosisId2Result = await db.query(`SELECT diagnosis_id AS "diagnosisId" FROM diagnoses WHERE diagnosis = 'D2'`);
    d2Id = diagnosisId2Result.rows[0].diagnosisId;
    const diagnosisId3Result = await db.query(`SELECT diagnosis_id AS "diagnosisId" FROM diagnoses WHERE diagnosis = 'D3'`);
    d3Id = diagnosisId3Result.rows[0].diagnosisId;
    const userId2Result = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u2@test.com'`);
    u2Id = userId2Result.rows[0].userId;
    const userId1Result = await db.query(`SELECT user_id AS "userId" FROM users WHERE email = 'u1@test.com'`);
    u1Id = userId1Result.rows[0].userId;
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/**Diagnosis.create */
describe('Diagnosis.create', function (){
    test('works with correct info', async function(){
        const diagnosis = await Diagnosis.create({
            diagnosisName: 'D4',
            synonyms: ['disorders']
        });
        expect(diagnosis).toEqual({
            diagnosisId: expect.any(Number),
            diagnosis: 'D4', 
            synonyms: ['disorders']
        });
        const found = await db.query(`SELECT * FROM diagnoses WHERE diagnosis = 'D4'`);
        expect(found.rows.length).toEqual(1);
    });
    test('bad request with duplicate diagnosis', async function(){
        try{
            await Diagnosis.create({
                diagnosisName: 'D1', 
                synonyms: ['diagnosis1'], 
            });
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        };
    });
    test('bad request with synonym diagnosis', async function(){
        try{
            await Diagnosis.create({
                diagnosisName: 'disease', 
                synonyms: ['diagnosis1'], 
            });
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }; 
    });
});

/**Diagnosis.getAll */
describe('Diagnosis.getAll', function(){
    test('works', async function(){
        const diagnoses = await Diagnosis.getAll();
        expect(diagnoses).toEqual([
            {
                diagnosisId: expect.any(Number),
                diagnosis: 'D1',
                synonyms: ['disease']
            },
            {
                diagnosisId: expect.any(Number),
                diagnosis: 'D2',
                synonyms: []
            },
            {
                diagnosisId: expect.any(Number),
                diagnosis: 'D3',
                synonyms: ['disorder']
            }
        ]);
    });
});

/**Diagnosis.getOne */
describe('Diagnosis.getOne', function(){
    test('works with valid diagnosis', async function(){
        const diagnosis = await Diagnosis.getOne(d1Id);
        expect(diagnosis).toEqual({
            diagnosisId: d1Id,
            diagnosis: 'D1', 
            synonyms: ['disease']
        });
    });
    test('NotFound error with invalid diagnosis', async function(){
        try {
            await Diagnosis.getOne('0');
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Diagnosis.edit */
describe('Diagnosis.edit', function(){
    test('works with valid data', async function(){
        const diagnosis = await Diagnosis.edit(d1Id, {
            synonyms: ['dissociate']
        });
        expect(diagnosis).toEqual({
            diagnosisId: d1Id,
            diagnosis: 'D1',
            synonyms: ['disease', 'dissociate']
        });
    });
    test('BadRequest error with duplicate diagnosis', async function(){

        try {
            await Diagnosis.edit(d2Id, {
                diagnosis: 'D1'
            });
            fail();
        } catch(err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
    test('BadRequest error with synonym diagnosis', async function(){
        try {
            await Diagnosis.edit(d2Id, {
                diagnosis: 'disease'
            });
            fail();
        } catch(err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
    test('NotFound error with invalid diagnosis', async function(){
        try {
            await Diagnosis.edit(0, {
                diagnosis: 'D0'
            });
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Diagnosis.delete */
describe('Diagnosis.delete', function(){
    test('works with valid data', async function(){
        await Diagnosis.delete(d3Id);
        const notFound = await db.query(`SELECT * FROM diagnoses WHERE diagnosis = 'D3'`);
        expect(notFound.rows.length).toEqual(0);
    });
    test('NotFound with invalid diagnosis', async function(){
        try {
            await Diagnosis.delete(0);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Diagnosis.userConnect */
describe('Diagnosis.userConnect', function(){
    test('works with valid data', async function(){
        const userDiagnosis = await Diagnosis.userConnect(u2Id, d1Id, {
            keywords: ['vertigo']
        });
        expect(userDiagnosis).toEqual({
            userId: u2Id,
            diagnosisId: d1Id,
            keywords: ['vertigo']
        });
        const found = await db.query(`SELECT * FROM users_diagnoses WHERE user_id = $1 AND diagnosis_id = $2`, [u2Id, d1Id]);
        expect(found.rows.length).toEqual(1);
    });
    test('NotFound error with invalid diagnosis', async function(){
            try {
            await Diagnosis.userConnect(u2Id, 0, {
                keywords: ['pain']
            });
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound error with invalid user', async function(){
            try {
            await Diagnosis.userConnect(0, d1Id, {
                keywords: ['pain']
            });
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Diagnosis.userGet */
describe('Diagnosis.userGet', function(){
    test('works with valid connection', async function(){
        const userDiagnosis = await Diagnosis.userGet(u1Id, d1Id);
        expect(userDiagnosis).toEqual({
            userId: u1Id,
            diagnosisId: d1Id,
            keywords: ["pain"]
        });
    });
    test('NotFound with invalid diagnosis', async function(){
        try {
            await Diagnosis.userGet(u1Id, 0);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid user', async function(){
        try {
            await Diagnosis.userGet(0, d1Id);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid userDiagnosis', async function(){
        try {
            await Diagnosis.userGet(u1Id, d3Id);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/**Diagnosis.userUpdate */
describe('Diagnosis.userUpdate', function(){
    test('works with valid data', async function(){
        const userDiagnosis = await Diagnosis.userUpdate(u1Id, d1Id, {
            keywords: ['fatigue']
        });
        expect(userDiagnosis).toEqual({
            userId: u1Id,
            diagnosisId: d1Id,
            keywords: ['pain', 'fatigue']
        });
    });
    test('NotFound with invalid diagnosis', async function(){
        try {
            await Diagnosis.userUpdate(u1Id, 0, {
                keywords: ['pain']
            });
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound error with invalid user', async function (){
        try {
            await Diagnosis.userUpdate(0, d1Id, {
                keywords: ['pain']
            });
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid userDiagnosis', async function(){
        try {
            await Diagnosis.userUpdate(u1Id, d3Id, {
                keywords: ['pain']
            });
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        } 
    });
});

/**Diagnosis.userDisconnect */
describe('Diagnosis.userDisconnect', function(){
    test('works with valid data', async function(){
        await Diagnosis.userDisconnect(u1Id, d1Id);
        const notfound = await db.query(`SELECT * FROM users_diagnoses WHERE user_id = $1 AND diagnosis_id = $2`, [u1Id, d1Id]);
        expect(notfound.rows.length).toEqual(0);
    });
    test('NotFound with invalid diagnosis', async function(){
        try {
            await Diagnosis.userDisconnect(u1Id, 0);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound error with invalid user', async function(){
        try {
            await Diagnosis.userDisconnect(0, d1Id);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
    test('NotFound with invalid userDiagnosis', async function(){
        try {
            await Diagnosis.userDisconnect(u1Id, d3Id);
            fail();
        } catch(err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});



