"use strict"

/**AUTHENTICATION ROUTES */

const jsonschema = require("jsonschema");

const User = require("../models/user");
const express = require('express');
const router = new express.Router();
const {createToken} = require("../helpers/tokens");
const userAuthSchema = require("../schemas/userAuth.json");
const userRegisterSchema = require("../schemas/userRegister.json");
const {BadRequestError} = require("../expressError");

/**POST /auth/signin: {email, password} => {token} 
 * 
 * Returns JWT token with user_id, email, and password for further authentication.
 * 
 * Authorization required: none
*/

router.post("/signin", async function(req, res, next){
    try{
        const validator = jsonschema.validate(req.body, userAuthSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const {email, password} = req.body;
        const user = await User.authenticate(email, password);
        const token = createToken(user);
        return res.json({token, userId: user.userId});
    } catch (err) {
        return next(err);
    }
});

/**POST /auth/register: {email, password, name} => {token} 
 * 
 * Returns JWT token with user_id, email, and password for further authentication.
 * 
 * Authorization required: none
*/

router.post('/register', async function(req, res, next){
    try{
        const validator = jsonschema.validate(req.body, userRegisterSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const {email, password, name} = req.body;
        const user = await User.register({...req.body, isAdmin: false});
        const token = createToken(user);
        return res.status(201).json({token, userId: user.userId});

    } catch (err){
        return next(err);
    }
});

/**GET /auth/ready
 * 
 * Returns a ready message telling the front end that the back end server is spun up and working
 * 
 * Authorization required: none
 */

router.get('/ready', async function(req, res, next){
    try {
        return res.json({status: "ok"});
    } catch (err) {
        return next(err);
    }
});

module.exports = router;