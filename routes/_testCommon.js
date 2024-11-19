"use strict"

const db = require('../db.js');
const User = require('../models/user');
const Diagnosis = require('../models/diagnosis');
const Symptom = require('../models/symptom');
const Medication = require('../models/medication');

let u1Id, u2Id, u3Id, d1Id, d2Id, d3Id, s1Id, s2Id, s3Id, st1Id, m1Id, m2Id, m3Id, mt1Id;
async function commonBeforeAll() {
    await db.query("DELETE from users");
    await db.query("DELETE from diagnoses");
    await db.query("DELETE from symptoms");
    await db.query("DELETE from medications");

    u1Id = (await User.register({
            password: "password",
            name: "U1",
            email: "u1@test.com"
    })).userId;

    const u2 = await User.register({
        password: 'password', 
        name: 'U2', 
        email: 'u2@test.com'
    });
    u2Id = u2.userId;

    const u3 = await User.register({
        password: 'password', 
        name: 'U3', 
        email: 'u3@test.com'
    });
    u3Id = u3.userId;

    const d1 = await Diagnosis.create({
        diagnosisName: 'D1',
        synonyms: ['d1', 'disease']
    });
    d1Id = d1.diagnosisId;

    const d2 = await Diagnosis.create({
        diagnosisName: 'D2', 
        synonyms: []
    });
    d2Id = d2.diagnosisId;

    const d3 = await Diagnosis.create({
        diagnosisName: 'D3', 
        synonyms: ['d3']
    });
    d3Id = d3.diagnosisId;

    await Diagnosis.userConnect(u1Id, d1Id, {keywords: ["pain"]});
    await Diagnosis.userConnect(u3Id, d3Id, {keywords: ["fatigue", "long covid"]});

    const s1 = await Symptom.create({
        symptomName: 'S1'
    });
    s1Id = s1.symptomId;

    const s2 = await Symptom.create({
        symptomName: 'S2'
    });
    s2Id = s2.symptomId;

    const s3 = await Symptom.create({
        symptomName: 'S3'
    });
    s3Id = s3.symptomId;

    await Symptom.userConnect(u1Id, s1Id);
    await Symptom.userConnect(u3Id, s3Id);

    const symtrack1 = await Symptom.track({
        userId: u1Id,
        symptomId: s1Id, 
        trackDate: '2024-09-21',
        timespan: '12-4 AM',
        severity: 3
    });
    st1Id = symtrack1.symtrackId;
    await Symptom.track({
        userId: u1Id,
        symptomId: s1Id,
        trackDate: '2024-09-21',
        timespan: '8 AM-12 PM',
        severity: 2
    });
    await Symptom.track({
        userId: u1Id,
        symptomId: s1Id,
        trackDate: '2024-09-21',
        timespan: '12-4 PM',
        severity: 1
    });

    const m1 = await Medication.create({
        medicationName: 'M1'
    });
    m1Id = m1.medId;

    const m2 = await Medication.create({
        medicationName: 'M2'
    });
    m2Id = m2.medId;

    const m3 = await Medication.create({
        medicationName: 'M3'
    });
    m3Id = m3.medId

    await Medication.userConnect(u1Id, m1Id, {dosageNum: 300, dosageUnit: 'mg', timeOfDay: ['AM', 'PM']});
    await Medication.userConnect(u3Id, m3Id, {dosageNum: 1, dosageUnti: 'pill', timeOfDay: ['AM', 'Midday', 'PM', 'Evening']});

    const mt = await Medication.track({
        userId: u1Id, 
        medId: m1Id, 
        trackDate: '2024-09-21',
        timeOfDay: 'AM', 
        number: 2
    });
    mt1Id = mt.medtrackId;
    await Medication.track({
        userId: u1Id, 
        medId: m1Id, 
        trackDate: '2024-09-21',
        timeOfDay: 'PM', 
        number: 1
    });
    await Medication.track({
        userId: u3Id, 
        medId: m3Id, 
        trackDate: '2024-09-21',
        timeOfDay: 'Midday', 
        number: 1
    });
};

async function commonBeforeEach() {
    await db.query("BEGIN");
};

async function commonAfterEach() {
    await db.query("ROLLBACK");
};

async function commonAfterAll() {
    await db.end();
}

const getU1Id = () => u1Id;
const getU2Id = () => u2Id;
const getU3Id = () => u3Id;
const getD1Id = () => d1Id;
const getD2Id = () => d2Id;
const getD3Id = () => d3Id;
const getS1Id = () => s1Id;
const getS2Id = () => s2Id;
const getS3Id = () => s3Id;
const getSt1Id = () => st1Id
const getM1Id = () => m1Id;
const getM2Id = () => m2Id;
const getM3Id = () => m3Id;
const getMt1Id = () => mt1Id;


module.exports = {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    getU1Id,
    getU2Id,
    getU3Id,
    getD1Id,
    getD2Id,
    getD3Id,
    getS1Id,
    getS2Id,
    getS3Id,
    getSt1Id,
    getM1Id,
    getM2Id,
    getM3Id,
    getMt1Id
}