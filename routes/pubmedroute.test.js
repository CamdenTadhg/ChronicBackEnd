"use strict";
process.env.NODE_ENV === "test";

const request = require('supertest');
const db = require('../db.js');
const app = require('../app.js');
const Pubmed = require('../models/pubmed.js');
const {createToken} = require('../helpers/tokens.js');
const {
    commonBeforeAll,
    commonBeforeEach, 
    commonAfterAll, 
    commonAfterEach,
    getU1Id
} = require('./_testCommon.js');

let u1Token;
beforeAll(commonBeforeAll);
beforeEach(() => {
    commonBeforeEach();
    u1Token = createToken({userId: getU1Id(), email: 'u1@test.com', isAdmin: false});
    const mockedArticleIds = ['345667', '2426734', '234245'];
    jest.spyOn(Pubmed, 'getArticleIds').mockImplementation(() => mockedArticleIds);
    const mockedArticleDetails = [{PMID: 8473, title: 'Chronic Fatigue Syndrome', abstract: 'This is an article about CFS'}, {PMID: 4395, title: 'Lyme Disease', abstract: 'This is an article about Lyme Disease'}];
    jest.spyOn(Pubmed, 'getArticles').mockImplementation(() => mockedArticleDetails);
});

afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** GET /latest/articleIds */
describe('GET /latest/articleIds', function(){
    test('works for user to get data', async function(){
        const resp = await request(app)
            .get(`/latest/articleIds?keywords=chronic%20fatigue%20syndrome%20&keywords=brain%20fog&keywords=long%20covid`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({articleIds: ['345667', '2426734', '234245']});
    });
    test('works for anonymous to get data', async function(){
        const resp = await request(app)
            .get(`/latest/articleIds?keywords=chronic%20fatigue%20syndrome%20&keywords=brain%20fog&keywords=long%20covid`);
        expect(resp.body).toEqual({articleIds: ['345667', '2426734', '234245']});
    });
    test('bad request with invalid data', async function (){
        const resp = await request(app)
            .get(`/latest/articleIds?keywords=`);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance[0] does not meet minimum length of 2');
    });
    test('bad request with missing data', async function() {
        const resp = await request(app)
            .get(`/latest/articleIds`);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('keywords are required');
    })
});

/** GET /latest/articles */
describe('GET /latest/articles', function(){
    test('works for user to get data', async function(){
        const resp = await request(app)
            .get(`/latest/articles?articleIds=12345678&articleIds=23456789`)
            .set('authorization', u1Token);
        expect(resp.body).toEqual({articles: [{PMID: 8473, title: 'Chronic Fatigue Syndrome', abstract: 'This is an article about CFS'}, {PMID: 4395, title: 'Lyme Disease', abstract: 'This is an article about Lyme Disease'}]});
    });
    test('works for anonymous to get data', async function(){
        const resp = await request(app)
            .get(`/latest/articles?articleIds=12345678&articleIds=23456789`);
        expect(resp.body).toEqual({articles: [{PMID: 8473, title: 'Chronic Fatigue Syndrome', abstract: 'This is an article about CFS'}, {PMID: 4395, title: 'Lyme Disease', abstract: 'This is an article about Lyme Disease'}]});
    });
    test('bad request with missing data', async function (){
        const resp = await request(app)
            .get(`/latest/articles`);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('articleIds are required')
    });
    test('bad request with invalid data', async function(){
        const resp = await request(app)
            .get(`/latest/articles?articleIds=3456`);
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toContain('instance[0] does not meet minimum length of 8');
    });
});
