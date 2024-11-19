"use strict";

/** USER ROUTES */

const jsonschema = require('jsonschema');
const express = require('express');
const {ensureLoggedIn, ensureAdminOrSelf, ensureAdmin} = require('../middleware/auth');
const {BadRequestError} = require('../expressError');
const User = require('../models/user');
const userNewSchema = require('../schemas/userNew.json');
const userUpdateSchema = require('../schemas/userUpdate.json');

const router = express.Router();

/** POST /users/ {email, password, name, isAdmin} => {user}
 * 
 * Returns new user with userId, email, name, isAdmin, lastLogin
 * 
 * Authorization required: admin
 */

router.post('/', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, userNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const user = await User.create(req.body);
        return res.status(201).json({user});
    } catch (err) {
        return next(err);
    }
});

/**GET /users/ => {users: [{userId, email, name, isAdmin, registrationDate, lastLogin}, ...]
 * 
 * Returns list of all users
 * 
 * Authorization required: admin
*/

router.get('/', ensureLoggedIn, ensureAdmin, async function (req, res, next){
    try {
        const users = await User.getAll();
        return res.json({users});
    } catch (err) {
        return next(err);
    }
});

/**GET /users/:userId => {user: {userId, email, name, isAdmin, lastLogin, diagnoses[{diagnosis, keywords}, ...], symptoms[], medications[{medicatoin, dosageNum, dosageUnit, timeOfDay}, ...]}
 * 
 * Returns a single user's details
 * 
 * Authorization required: admin or self
*/

router.get('/:userId', ensureLoggedIn, ensureAdminOrSelf, async function (req, res, next){
    try {
        const user = await User.getOne(req.params.userId);
        return res.json({user});
    } catch (err) {
        return next(err);
    }
});

/**PATCH /users/:userId {email, name, password} => {email, name, password} 
 * 
 * Edits a single user's details
 * 
 * Authorization required: admin or self
*/

router.patch('/:userId', ensureLoggedIn, ensureAdminOrSelf, async function (req, res, next){
    try {
        const validator = jsonschema.validate(req.body, userUpdateSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const user = await User.edit(req.params.userId, req.body);
        return res.json({user});
    } catch (err) {
        return next(err);
    }
});

/**DELETE /users/:userId => {userId}
 * 
 * Deletes a user
 * 
 * Authorization required: admin or self
 */

router.delete('/:userId', ensureLoggedIn, ensureAdminOrSelf, async function (req, res, next){
    try {
        await User.delete(req.params.userId);
        return res.json({deleted: parseInt(req.params.userId)});
    } catch (err) {
        return next(err);
    }
});

module.exports = router;