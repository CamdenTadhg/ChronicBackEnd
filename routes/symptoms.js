"use strict"

/** SYMPTOM ROUTES */

const jsonschema = require('jsonschema');
const express = require('express');
const {ensureLoggedIn, ensureAdminOrSelf, ensureAdmin} = require('../middleware/auth');
const {BadRequestError} = require('../expressError');
const Symptom = require('../models/symptom');
const symptomNewSchema = require('../schemas/symptomNew.json');
const symptomUpdateSchema = require('../schemas/symptomUpdate.json');
const userSymptomNewSchema = require('../schemas/userSymptomNew.json');
const userSymptomChangeSchema = require('../schemas/userSymptomChange.json');
const userSymptomChangeNewSchema = require('../schemas/userSymptomChangeNew.json');
const symptomTrackingNewSchema = require('../schemas/symptomTrackingNew.json');
const symptomTrackingUpdateSchema = require('../schemas/symptomTrackingUpdate.json');

const router = express.Router();

/** POST /symptoms/ {symptom} => {symptom} 
 * 
 * Returns a new symptom object with symptomId and symptom
 * 
 * Authorization required: admin
*/

router.post('/', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, symptomNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const symptom = await Symptom.create(req.body);
        return res.status(201).json({symptom});
    } catch(err) {
        return next(err);
    }
});

/** GET /symptoms/ => {symptoms: [{symptomId, symptom}, ...]} 
 * 
 * Returns list of all symptoms
 * 
 * Authorization required: logged in
*/

router.get('/', ensureLoggedIn, async function(req, res, next){
    try {
        const symptoms = await Symptom.getAll();
        return res.json({symptoms});
    } catch(err) {
        return next(err);
    }
});

/** GET /symptoms/:symptomId => {symptom: {symptomId, symptom}}
 * 
 * Returns details of a single symptom
 * 
 * Authorization required: admin
 */

router.get('/:symptomId', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const symptom = await Symptom.getOne(req.params.symptomId);
        return res.json({symptom})
    } catch(err) {
        return next(err);
    }
});

/** PATCH /symptoms/:symptomId  {symptom} => {symptom: {symptomId, symptom}} 
 * 
 * Edits a single symptom's name
 * 
 * Authorization required: admin
*/

router.patch('/:symptomId', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, symptomUpdateSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const symptom = await Symptom.edit(req.params.symptomId, req.body);
        return res.json({symptom});
    } catch(err) {
        return next(err);
    }
})

/** DELETE /symptoms/:symptomId => {deleted: symptomId} 
 * 
 * Deletes a single symptom
 * 
 * Authorization required: admin
*/

router.delete('/:symptomId', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const deleted = await Symptom.delete(req.params.symptomId);
        return res.json({deleted: deleted.symptomId});
    } catch(err) {
        return next(err);
    }
})

/** POST /symptoms/:symptomId/users/:userId  
 * => {userSymptom: {userId, symptomId}} 
 * OR
 * {symptom} => {userSymptom: {userId, symptomId}}
 * 
 * Connects a user to a symptom
 * If :symptomId is 0, creates a new symptom with the given symptom data and connects it to the user
 * 
 * Authorization required: admin or self
*/

router.post('/:symptomId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    let userSymptom;
    try{
        if (req.params.symptomId == 0){
            const validator = jsonschema.validate(req.body, userSymptomNewSchema);
            if (!validator.valid){
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }
            const data = {symptomName: req.body.symptom}
            const newSymptom = await Symptom.create(data);
            userSymptom = await Symptom.userConnect(req.params.userId, newSymptom.symptomId);
        } else {
            userSymptom = await Symptom.userConnect(req.params.userId, req.params.symptomId);
        }
        return res.status(201).json({userSymptom});
    } catch(err) {
        return next(err);
    }
});

/** GET /symptoms/:symptomId/users/:userId => {userSymptom: {userId, symptomId}} 
 * 
 * Gets a single userSymptom record
 * 
 * Authorization: admin or self
*/

router.get('/:symptomId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        const userSymptom = await Symptom.userGet(req.params.userId, req.params.symptomId);
        return res.json({userSymptom});
    } catch(err) {
        return next(err);
    }
});

/** PATCH /symptoms/:symptomId/users/:userId {newSymptomId} => {userSymptom: {userId, symptomId}
 * OR
 * {symptom} => {userSymptom: userId, symptomId}
 * 
 * Replaces existing symptom id with a new symptom id, changing the record and cascading changes to all existing symptom tracking records for that connection. If symptom is new to the system, creates a new symptom and the performs the previous.
 * 
 * Authorization required: admin or self
*/

router.patch('/:symptomId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        let userSymptom;
        if (req.body.symptom){
            const validator = jsonschema.validate(req.body, userSymptomChangeNewSchema);
            if (!validator.valid) {
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }
            const data = {symptomName: req.body.symptom}
            const newSymptom = await Symptom.create(data);
            userSymptom = await Symptom.userChange(parseInt(req.params.userId), parseInt(req.params.symptomId), {newSymptomId: newSymptom.symptomId});
        } else {
            const validator = jsonschema.validate(req.body, userSymptomChangeSchema);
            if (!validator.valid) {
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }
            userSymptom = await Symptom.userChange(parseInt(req.params.userId), parseInt(req.params.symptomId), req.body);
        }
        return res.json({userSymptom});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /symptoms/:symptomId/users/:userId  => {disconnected: ['Symptom symptomId', 'User userId']}
 * 
 * Disconnects a user from a symptom, deleting all related tracking records
 * 
 * Authorization required: admin or self
*/

router.delete('/:symptomId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        await Symptom.userDisconnect(parseInt(req.params.userId), parseInt(req.params.symptomId));
        return res.json({disconnected: [`User ${req.params.userId}`, `Symptom ${req.params.symptomId}`]});
    } catch(err) {
        return next(err);
    }
})

/** POST /symptoms/users/:userId/tracking  {symptomId, trackDate, timespan, severity} =>  {trackingRecord: {symtrackId, userId, symptomId, trackDate, timespan, severity, trackedAt}}
 * 
 * Creates a new symptom tracking record for a specific user, symptom, date, and time
 * 
 * Authorization required: admin or self
*/

router.post('/users/:userId/tracking', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, symptomTrackingNewSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs)
        }

        const trackingRecord = await Symptom.track({...req.body, userId: req.params.userId});
        return res.status(201).json({trackingRecord});
    } catch(err) {
        return next(err);
    }
})

/** GET /symptoms/users/:userId/tracking => {trackingRecords: [{symtrackId, userId, symptomId, trackDate, timespan, severity, trackedAt}, ...]} 
 * 
 * Returns an array of all symptom tracking records associated with the specificied user
 * 
 * Authorization required: admin or self
*/

router.get('/users/:userId/tracking', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const trackingRecords = await Symptom.getAllTracking(req.params.userId);
        return res.json({trackingRecords});
    } catch(err) {
        return next(err);
    }
})

/** GET /symptoms/users/:userId/tracking/:symtrackId => {trackingRecord: {symtrackId, userId, symptomId, trackDate, timespan, severity, trackedAt}}
 * 
 * Returns a single symptom tracking record
 * 
 * Authorization required: admin or self
 */

router.get('/users/:userId/tracking/:symtrackId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const trackingRecord = await Symptom.getOneTracking(req.params.symtrackId, req.params.userId);
        return res.json({trackingRecord});
    } catch(err) {
        return next(err);
    }
})

/** GET /symptoms/users/:userId/trackingbydate/:date  => {trackingRecords: [{symtrackId, userId, symptomId, trackDate, timespan, severity, trackedAt}, ...]} 
 * 
 * Returns an array of all symptom tracking records associated with the specified user on the specified date
 * 
 * Authorization required: admin or self
*/

router.get('/users/:userId/trackingbydate/:date', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const trackingRecords = await Symptom.getDayTracking(req.params.userId, req.params.date);
        return res.json({trackingRecords});
    } catch(err) {
        return next(err);
    }
})

/** PATCH /symptoms/users/:userId/tracking/:symtrackId  {severity} => {trackingRecord: {symtrackId, userId, symptomId, trackDate, timespan, severity, trackedAt}}
 * 
 * Changes the severity in a single symptom tracking record
 * 
 * Authorization required: admin or self
*/

router.patch('/users/:userId/tracking/:symtrackId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, symptomTrackingUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const {symptomId, trackDate, timespan, severity} = req.body;
        const trackingRecord = await Symptom.editTracking(req.params.userId, symptomId, trackDate, timespan, severity);
        return res.json({trackingRecord});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /symptoms/users/:userId/tracking/:symtrackId  => {deleted: symtrackId}
 * 
 * Deletes a single symptom tracking record
 * 
 * Authorization required: admin or self
*/

router.delete('/users/:userId/tracking/:symtrackId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        const deleted = await Symptom.deleteTracking(req.params.symtrackId);
        return res.json({deleted: deleted.symtrackId});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /symptoms/users/:userId/trackingbydate/:date  => {deleted: trackDate} 
 * 
 * Deletes all symptom tracking records for a single day
 * 
 * Authorization required: admin or self
*/

router.delete('/users/:userId/trackingbydate/:date', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        await Symptom.deleteDayTracking(req.params.userId, req.params.date);
        return res.json({deleted: req.params.date});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;