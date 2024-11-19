process.env.NODE_ENV === "test";

const jwt = require('jsonwebtoken');
const {createToken } = require('./tokens');
const {SECRET_KEY} = require('../config');


describe('createToken', function () {
    test('works for non-admin', function () {
        const token = createToken({userId: 1, isAdmin: false});
        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            userId: 1,
            isAdmin: false,
        });
    });

    test('works for admin', function () {
        const token = createToken({userId: 2, isAdmin: true});
        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            userId: 2,
            isAdmin: true,
        });
    });

    test('works for default non-admin', function () {
        const token = createToken({userId: 3});
        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            userId: 3,
            isAdmin: false,
        });
    });
});