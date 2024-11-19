"use strict"

/** DATA ROUTES */

const jsonschema = require('jsonschema');
const express = require('express');
const {ensureLoggedIn, ensureAdminOrSelf} = require('../middleware/auth');
const {BadRequestError} = require('../expressError');
const Data = require('../models/data');
const symptomDataSchema = require('../schemas/symptomData.json');
const medsDataSchema = require('../schemas/medsData.json');

const router = express.Router();

/** GET /data/symptoms  {userId, startDate, endDate, symptoms[symptomId, ...]} => {dataset} 
 * 
 * Returns dataset object {symptom1: [{datetime, severity}, ...], symptom2: [{datetime, severity}, ...], ...}
 * 
 * Authorization required: admin or self
*/

router.get('/symptoms', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        const symptomArray = Array.isArray(req.query.symptoms) ? req.query.symptoms : [req.query.symptoms];
        const symptoms = symptomArray.map((val) => Number(val));
        const data =  {
            userId: Number(req.query.userId),
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            symptoms: symptoms
        }
        const validator = jsonschema.validate(data, symptomDataSchema);
        if(!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const dataset = await Data.symptoms(data);
        return res.json({dataset});
    } catch(err) {
        return next(err);
    }
});

/** GET /data/meds  {userId, startDate, endDate, meds[medId, ...]} => {dataset} 
 * 
 * Returns dataset object {medication1: [{datetime, number}, ...], medication2: [{datetime, number}, ...], ...}
 * 
 * Authorization required: admin or self
*/

router.get('/meds', ensureLoggedIn, ensureAdminOrSelf, async function(req, res, next){
    try{
        const medsArray = Array.isArray(req.query.meds) ? req.query.meds : [req.query.meds];
        const meds = medsArray.map((val) => Number(val));
        const data =  {
            userId: Number(req.query.userId),
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            meds: meds
        }
        const validator = jsonschema.validate(data, medsDataSchema);
        if(!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        
        const dataset = await Data.meds(data);
        return res.json({dataset});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;