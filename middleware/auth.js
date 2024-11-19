"use strict"

const jwt = require('jsonwebtoken');
const {SECRET_KEY} = require('../config');
const {UnauthorizedError, ForbiddenError} = require('../expressError');

/**Middleware to authenticate user
 * 
 * verify provided token and, if valid, store on res.locals 
 * (userId, email, isAdmin)
 * If no token provided, move to next. 
 */

function authenticateJWT(req, res, next){
    try {
        const authHeader = req.headers && req.headers.authorization;
        if (authHeader) {
            res.locals.user = jwt.verify(authHeader, SECRET_KEY);
        }
        return next();
    } catch (err) {
        return next();
    }
};

/**Middleware to ensure user is logged in. Raises Unauthorized error if not 
 * logged in
 */
function ensureLoggedIn(req, res, next) {
    try {
        if (!res.locals.user) throw new UnauthorizedError();
        return next();
    } catch (err) {
        return next(err);
    }
};

/**Middleware to ensure user is admin. Raises Forbidden error if not admin */
function ensureAdmin(req, res, next) {
    try {
        if (res.locals.user.isAdmin === false) throw new ForbiddenError();
        return next();
    } catch(err) {
        return next(err);
    }
}

/**Middleware to ensure user is admin or editing own records. Raises forbidden
 * error if conditions are not satisfied.
 */
function ensureAdminOrSelf(req, res, next) {
    try {
        let counter = 0;
        if (res.locals.user.isAdmin) counter++;
        if (req.params){
            if (req.params.userId == res.locals.user.userId) counter++;
        }
        if (req.body){
            if (req.body.userId == res.locals.user.userId) counter++;
        }
        if (req.query){
            if (req.query.userId == res.locals.user.userId) counter++;
        }
        if (counter === 0) throw new ForbiddenError();
        return next(); 
    } catch(err) {
        return next(err);
    }
}

module.exports = {
    authenticateJWT,
    ensureLoggedIn,
    ensureAdmin,
    ensureAdminOrSelf
}