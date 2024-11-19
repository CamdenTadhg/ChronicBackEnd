"use strict";
process.env.NODE_ENV === "test";

const jwt = require('jsonwebtoken');
const {UnauthorizedError, ForbiddenError} = require("../expressError");
const {
    authenticateJWT,
    ensureLoggedIn,
    ensureAdmin, 
    ensureAdminOrSelf
} = require("./auth");
const {SECRET_KEY} = require('../config');
const testJwt = jwt.sign({userId: 1, email: 'test@test.com', isAdmin: false}, SECRET_KEY);
const adminJwt = jwt.sign({userId: 2, email: 'camdent@gmail.com', isAdmin: true}, SECRET_KEY);
const badJwt = jwt.sign({userId: 3, email: 'test@test.com', isAdmin: false}, 'badSecretKey');

describe("authenticateJWT", function () {
    test("user auth via header", function () {
        const req = {headers: {authorization: testJwt}};
        const res = {locals: {}};
        const next = function(err) {
            expect(err).toBeFalsy();
        };
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({
            user: {
                iat: expect.any(Number),
                userId: 1,
                email: 'test@test.com',
                isAdmin: false,
            },
        });
    });
    test('fails with invalid token', function () {
        const req = {headers: {authorization: badJwt}};
        const res = {locals: {}};
        const next = function(err) {
            expect(err).toBeFalsy();
        };
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({});
    });
});

describe("ensureLoggedIn", function () {
    test("authorized if logged in", function () {
        const req = {};
        const res = {locals: {user: {userId: 1, email: "test@test.com", isAdmin: false}}};
        const next = function(err) {
            expect(err).toBeFalsy();
        };
        ensureLoggedIn(req, res, next);
    });
    test("unauthorized if not logged in", function () {
        const req = {};
        const res = {locals: {}};
        const next = function(err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        };
        ensureLoggedIn(req, res, next);
    });
});

describe("ensureAdmin", function(){
    test("authorized if admin", function () {
        const req = {};
        const res = {locals: {user: {userId: 2, email: 'camdent@gmail.com', isAdmin:true}}};
        const next = function(err) {
            expect(err).toBeFalsy();
        };
        ensureAdmin(req, res, next);
    });
    test('forbidden if not admin', function () {
        const req = {};
        const res = {locals: {user: {userId: 1, email: 'test@test.com', isAdmin: false}}};
        const next = function(err) {
            expect(err instanceof ForbiddenError).toBeTruthy();
        };
        ensureAdmin(req, res, next);
    });
});

describe('ensureAdminOrSelf', function () {
    test('authorized if self in parameters', function () {
        const req = {params: {userId: 1}};
        const res = {locals: {user: {userId: 1, email: "test@test.com", isAdmin: false}}};
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        ensureAdminOrSelf(req, res, next);
    });
    test('authorized if self in body', function() {
        const req = {body: {userId: 1}};
        const res = {locals: {user: {userId: 1, email: "test@test.com", isAdmin: false}}};
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        ensureAdminOrSelf(req, res, next);
    })
    test('authorized if admin', function () {
        const req = {params: {userId: 1}};
        const res = {locals: {user: {userId: 2, email: 'camdent@gmail.com', isAdmin: true}}};
        const next = function(err) {
            expect(err).toBeFalsy();
        };
        ensureAdminOrSelf(req, res, next);
    });
    test('forbidden if not self or admin', function () {
        const req = {params: {userId: 1}};
        const res = {locals: {user: {userId: 4, email: 'test2@test.com', isAdmin: false}}};
        const next = function(err) {
            expect(err instanceof ForbiddenError).toBeTruthy();
        };
        ensureAdminOrSelf(req, res, next);
    });
});

