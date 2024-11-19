"use strict"

const db = require('../db');
const {
    NotFoundError
} = require('../expressError');

function arrayDiff(a, b) {
    let difference = [];
    for (let i = 0; i < a.length; i++){
        if (b.indexOf(a[i]) === -1){
            difference.push(a[i])
        }
    }
    return difference;
}

function textCreator(array, id, CheckText, counter){
    for (let i = 0; i < array.length; i++){
        if (i === array.length - 1){
            CheckText = CheckText + `${id} = $${counter}`;
        } else {
            CheckText = CheckText + `${id} = $${counter} OR `;
            counter++;
        }
    }
    return CheckText;
}

class Data{
    /** Symptoms
     * inputs: {userId, startDate, endDate, symptoms[symptomId, ...]}
     * outputs: {symptom: [{datetime, severity},...], ...}
     * NotFound error on invalid symptomId
     * NotFound error on symptomId not assigned to user
     */

    static async symptoms({userId, startDate, endDate, symptoms}){
        //determine that all given symptoms are valid
        let firstCheck = 'WHERE ';
        let firstCounter = 1;
        const queryText = textCreator(symptoms, 'symptom_id', firstCheck, firstCounter);
        const symptomCheck = await db.query(`
            SELECT symptom_id AS "symptomId"
            FROM symptoms
            ${queryText}`, [...symptoms]);
        //if not, throw error
        if (symptomCheck.rows.length !== symptoms.length){
            const validSymptoms = [];
            for (let row of symptomCheck.rows){
                validSymptoms.push(row.symptomId);
            }
            const problemSymptom = arrayDiff(symptoms, validSymptoms);
            throw new NotFoundError(`Symptom ${problemSymptom} does not exist`)
        }
        //determine that all given symptoms are assigned to user
        let secondCheck = `WHERE user_id = $1 AND (`
        let secondCounter = 2;
        const secondQueryText = textCreator(symptoms, 'symptom_id', secondCheck, secondCounter);
        const userSymptomCheck = await db.query(`
            SELECT symptom_id AS "symptomId"
            FROM users_symptoms
            ${secondQueryText})`, [userId, ...symptoms]);
        //if not, throw error
        if (userSymptomCheck.rows.length !== symptoms.length){
            const validSymptoms = [];
            for (let row of userSymptomCheck.rows){
                validSymptoms.push(row.symptomId)
            }
            const problemSymptom = arrayDiff(symptoms, validSymptoms);
            throw new NotFoundError(`Symptom ${problemSymptom} is not associated with this user`)
        }
        let datasetsObject = {};
        //for each symptom, use query to collect given data
        for (let symptom of symptoms){
            const dataset = await db.query(`
                SELECT  data_timestamp AS "datetime", 
                        severity
                FROM symptom_tracking
                WHERE track_date >= $1 
                AND track_date <= $2 
                AND symptom_id = $3
                AND user_id = $4
                ORDER BY data_timestamp`,
                [startDate, endDate, symptom, userId]);
            const symptomName = await db.query(`
                SELECT symptom 
                FROM symptoms
                WHERE symptom_id = $1`,
                [symptom]);
            datasetsObject[symptomName.rows[0].symptom] = dataset.rows;
        }
    return datasetsObject;
    }

    /** Meds
     * inputs: {userId, startDate, endDate, meds[medId, ...]}
     * outputs: {medication: [{datetime, number},...], ...}
     * NotFound error on invalid medId
     * NotFound error on medId not assigned to user
     */

        static async meds({userId, startDate, endDate, meds}){
            //determine that all given meds are valid
            let firstCheck = 'WHERE ';
            let firstCounter = 1;
            const queryText = textCreator(meds, 'med_id', firstCheck, firstCounter);
            const medCheck = await db.query(`
                SELECT med_id AS "medId"
                FROM medications
                ${queryText}`, [...meds]);
            //if not, throw error
            if (medCheck.rows.length !== meds.length){
                const validMeds = [];
                for (let row of medCheck.rows){
                    validMeds.push(row.medId)
                }
                const problemMed = arrayDiff(meds, validMeds);
                throw new NotFoundError(`Medication ${problemMed} does not exist`)
            }
            //determine that all given meds are assigned to user
            let secondCheck = `WHERE user_id = $1 AND (`
            let secondCounter = 2;
            const secondQueryText = textCreator(meds, 'med_id', secondCheck, secondCounter);
            const userMedicationCheck = await db.query(`
                SELECT med_id AS "medId"
                FROM users_medications
                ${secondQueryText})`, [userId, ...meds]);
            //if not, throw error
            if (userMedicationCheck.rows.length !== meds.length){
                const validMeds = [];
                for (let row of userMedicationCheck.rows){
                    validMeds.push(row.medId);
                }
                const problemMed = arrayDiff(meds, validMeds);
                throw new NotFoundError(`Medication ${problemMed} is not associated with this user`)
            }
            let datasetsObject = {};
            //for each medication, use query to collect given data
            for (let medication of meds){
                const dataset = await db.query(`
                    SELECT  data_timestamp AS "datetime", 
                            number
                    FROM medication_tracking
                    WHERE track_date >= $1 
                    AND track_date <= $2 
                    AND med_id = $3
                    AND user_id = $4
                    ORDER BY data_timestamp`,
                    [startDate, endDate, medication, userId]);
                const medicationName = await db.query(`
                    SELECT medication 
                    FROM medications
                    WHERE med_id = $1`,
                    [medication]);
                datasetsObject[medicationName.rows[0].medication] = dataset.rows;
            }
        return datasetsObject;
        }
}

module.exports = Data;