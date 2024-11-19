const jwt = require('jsonwebtoken');
const {SECRET_KEY} = require('../config');

/** CreateToken function
 * INPUT: user object
 * OUTPUT: signed JWT token
 */

function createToken(user) {
    let payload = {
        userId: user.userId,
        isAdmin: user.isAdmin || false,
    };

    return jwt.sign(payload, SECRET_KEY);
};

module.exports = {createToken};