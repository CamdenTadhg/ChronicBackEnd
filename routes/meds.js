"use strict"

/** MEDICATION ROUTES */

const jsonschema = require('jsonschema');
const express = require('express');
const {ensureLoggedIn, ensureAdminOrSelf, ensureAdmin} = require('../middleware/auth');
const {BadRequestError} = require('../expressError');
const Medication = require('../models/medication');
const medNewSchema = require('../schemas/medNew.json');
const medUpdateSchema = require('../schemas/medUpdate.json');
const userMedNewSchema = require('../schemas/userMedNew.json');
const userMedNewMedSchema = require('../schemas/userMedNewMed.json');
const userMedChangeSchema = require('../schemas/userMedChange.json');
const userMedChangeNewSchema = require('../schemas/userMedChangeNew.json');
const medTrackingNewSchema = require('../schemas/medTrackingNew.json');
const medTrackingUpdateSchema = require('../schemas/medTrackingUpdate.json');

const router = express.Router();

/** POST /meds/ {medication} => {medication} 
 * 
 * Returns a new medication object with medId and medication
 * 
 * Authorization required: admin
*/

router.post('/', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, medNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const medication = await Medication.create(req.body);
        return res.status(201).json({medication});
    } catch(err) {
        return next(err);
    }
});

/** GET /meds/ => {meds: [{medId, medication}, ...]} 
 * 
 * Returns list of all meds
 * 
 * Authorization required: logged in
*/

router.get('/', ensureLoggedIn, async function(req, res, next){
    try {
        const medications = await Medication.getAll();
        return res.json({medications});
    } catch(err) {
        return next(err);
    }
});

/** GET /meds/:medId => {medication: {medId, medication}}
 * 
 * Returns details of a single medication
 * 
 * Authorization required: admin
 */

router.get('/:medId', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const medication = await Medication.getOne(req.params.medId);
        return res.json({medication})
    } catch(err) {
        return next(err);
    }
});

/** PATCH /medications/:medId  {medication} => {medication: {medId, medication}} 
 * 
 * Edits a single medication's name
 * 
 * Authorization required: admin
*/

router.patch('/:medId', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, medUpdateSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const medication = await Medication.edit(req.params.medId, req.body);
        return res.json({medication});
    } catch(err) {
        return next(err);
    }
})

/** DELETE /meds/:medId => {deleted: medId} 
 * 
 * Deletes a single medication
 * 
 * Authorization required: admin
*/

router.delete('/:medId', ensureLoggedIn, ensureAdmin, async function(req, res, next){
    try {
        const deleted = await Medication.delete(req.params.medId);
        return res.json({deleted: deleted.medId});
    } catch(err) {
        return next(err);
    }
})

/** POST /meds/:medId/users/:userId  
 * => {userMedication: {userId, medId, dosageNum, dosageUnit, timeOfDay}} 
 * OR
 * {medication} => {userMedication: {userId, medId, dosageNum, dosageUnit, timeOfDay}}
 * 
 * Connects a user to a medication
 * If :medId is 0, creates a new medication with the given medication data and connects it to the user
 * 
 * Authorization required: admin or self
*/

router.post('/:medId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    let userMedication;
    try{
        if (req.params.medId == 0){
            const validator = jsonschema.validate(req.body, userMedNewMedSchema);
            if (!validator.valid){
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }
            const data = {medicationName: req.body.medication}
            const newMedication = await Medication.create(data);
            userMedication = await Medication.userConnect(req.params.userId, newMedication.medId, req.body);
        } else {
            const validator = jsonschema.validate(req.body, userMedNewSchema);
            if (!validator.valid){
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs)
            }
            userMedication = await Medication.userConnect(req.params.userId, req.params.medId, req.body);
        }
        return res.status(201).json({userMedication});
    } catch(err) {
        return next(err);
    }
});

/** GET /meds/:medId/users/:userId => {userMedication: {userId, medId, dosageNum, dosageUnit, timeOfDay}} 
 * 
 * Gets a single userMedication record
 * 
 * Authorization: admin or self
*/

router.get('/:medId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        const userMedication = await Medication.userGet(req.params.userId, req.params.medId);
        return res.json({userMedication});
    } catch(err) {
        return next(err);
    }
});

/** PATCH /meds/:medId/users/:userId {newMedicationId} => {userMedication: {userId, medId, dosageNum, dosageUnit, timeOfDay}
 * 
 * Replaces existing medication id with a new medication id, changing the record and cascading changes to all existing medication tracking records for that connection.
 * 
 * Authorization required: admin or self
*/

router.patch('/:medId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        let userMed;
        if (req.body.medication){
            const validator = jsonschema.validate(req.body, userMedChangeNewSchema);
            if (!validator.valid) {
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }
            const data = {medicationName: req.body.medication};
            const newMedication = await Medication.create(data);
            req.body.newMedId = newMedication.medId;
            userMed = await Medication.userChange(parseInt(req.params.userId), parseInt(req.params.medId), req.body);
        } else {
            const validator = jsonschema.validate(req.body, userMedChangeSchema);
            if (!validator.valid) {
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }
            userMed = await Medication.userChange(parseInt(req.params.userId), parseInt(req.params.medId), req.body);
        }
        return res.json({userMed});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /meds/:medId/users/:userId  => {deleted: ['Medication medId', 'User userId']}
 * 
 * Disconnects a user from a medication, deleting all related tracking records
 * 
 * Authorization required: admin or self
*/

router.delete('/:medId/users/:userId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        await Medication.userDisconnect(req.params.userId, req.params.medId);
        return res.json({deleted: [`User ${req.params.userId}`, `Medication ${req.params.medId}`]});
    } catch(err) {
        return next(err);
    }
})

/** POST /meds/users/:userId/tracking  {medId, trackDate, timeOfDay, number} =>  {trackingRecord: {medtrackId, userId, medId, trackDate, timeOfDay, number, trackedAt}}
 * 
 * Creates a new medication tracking record for a specific user, medication, date, and time
 * 
 * Authorization required: admin or self
*/

router.post('/users/:userId/tracking', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, medTrackingNewSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs)
        }

        const trackingRecord = await Medication.track({...req.body, userId: req.params.userId});
        return res.status(201).json({trackingRecord});
    } catch(err) {
        return next(err);
    }
})

/** GET /meds/users/:userId/tracking => {trackingRecords: [{medtrackId, userId, medId, trackDate, timeOfDay, number, trackedAt}, ...]} 
 * 
 * Returns an array of all medication tracking records associated with the specificied user
 * 
 * Authorization required: admin or self
*/

router.get('/users/:userId/tracking', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const trackingRecords = await Medication.getAllTracking(req.params.userId);
        return res.json({trackingRecords});
    } catch(err) {
        return next(err);
    }
})

/** GET /meds/users/:userId/tracking/:symtrackId => {trackingRecord: {medtrackId, userId, medId, trackDate, timeOfDay, number, trackedAt}}
 * 
 * Returns a single medication tracking record
 * 
 * Authorization required: admin or self
 */

router.get('/users/:userId/tracking/:medtrackId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const trackingRecord = await Medication.getOneTracking(req.params.medtrackId, req.params.userId);
        return res.json({trackingRecord});
    } catch(err) {
        return next(err);
    }
})

/** GET /meds/users/:userId/trackingbydate/:date  => {trackingRecords: [{medtrackId, userId, medId, trackDate, timeOfDay, number, trackedAt}, ...]} 
 * 
 * Returns an array of all medication tracking records associated with the specified user on the specified date
 * 
 * Authorization required: admin or self
*/

router.get('/users/:userId/trackingbydate/:date', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const trackingRecords = await Medication.getDayTracking(req.params.userId, req.params.date);
        return res.json({trackingRecords});
    } catch(err) {
        return next(err);
    }
})

/** PATCH /meds/users/:userId/tracking/:medtrackId  {number} => {trackingRecord: {medtrackId, userId, medId, trackDate, timeOfDay, number, trackedAt}}
 * 
 * Changes the number in a single medication tracking record
 * 
 * Authorization required: admin or self
*/

router.patch('/users/:userId/tracking/:medtrackId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try {
        const validator = jsonschema.validate(req.body, medTrackingUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const {medId, trackDate, timeOfDay, number} = req.body;
        const trackingRecord = await Medication.editTracking(req.params.userId, medId, trackDate, timeOfDay, number);
        return res.json({trackingRecord});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /meds/users/:userId/tracking/:medtrackId  => {deleted: medtrackId}
 * 
 * Deletes a single medication tracking record
 * 
 * Authorization required: admin or self
*/

router.delete('/users/:userId/tracking/:medtrackId', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        const deleted = await Medication.deleteTracking(req.params.userId, req.params.medtrackId);
        return res.json({deleted: deleted.medtrackId});
    } catch(err) {
        return next(err);
    }
});

/** DELETE /meds/users/:userId/trackingbydate/:date  => {deleted: trackDate} 
 * 
 * Deletes all medication tracking records for a single day
 * 
 * Authorization required: admin or self
*/

router.delete('/users/:userId/trackingbydate/:date', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        await Medication.deleteDayTracking(req.params.userId, req.params.date);
        return res.json({deleted: req.params.date});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;