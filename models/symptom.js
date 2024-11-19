"use strict";

const db = require('../db');
const {
    NotFoundError,
    BadRequestError} = require('../expressError');

class Symptom{
    /**Create
     * inputs: {symptom}
     * outputs: {symptomId, symptom}
     * BadRequest error on duplicate symptom
     */
    static async create({symptomName}){
        const duplicateCheck = await db.query(
            `SELECT symptom_id
            FROM symptoms
            WHERE symptom = $1`,
            [symptomName]
        );
        if (duplicateCheck.rows[0]){
            throw new BadRequestError(`${symptomName} already exists.`)
        };

        const result = await db.query(
            `INSERT INTO symptoms
            (symptom)
            VALUES ($1)
            RETURNING symptom_id AS "symptomId", symptom`,
            [symptomName]
        );
        const symptom = result.rows[0];
        return symptom;
    };

    /**GetAll
     * inputs: none
     * outputs: [{symptomId, symptom}, ...]
     */

    static async getAll(){
        const result = await db.query(
            `SELECT symptom_id AS "symptomId",
                    symptom
            FROM symptoms
            ORDER BY symptom`
        );
        return result.rows;
    };

    /**GetOne
     * inputs: symptomId
     * outputs: {symptomId, symptom}
     * NotFound error on symptom not found
     */

    static async getOne(symptomId) {
        const result = await db.query(
            `SELECT symptom_id AS "symptomId",
                    symptom
            FROM symptoms
            WHERE symptom_id = $1`,
            [symptomId]
        );
        const symptom = result.rows[0];
        if (!symptom) throw new NotFoundError('No such symptom exists');
        return symptom;
    };

    /**Edit
     * inputs: symptomId, {symptom}
     * outputs: {symptomId, symptom}
     * NotFound error on symptom not found
     */

    static async edit(symptomId, data){
        const duplicateCheck = await db.query(
            `SELECT symptom_id
            FROM symptoms
            WHERE symptom = $1`,
            [data.symptom]
        );
        if (duplicateCheck.rows[0]){
            throw new BadRequestError(`${data.symptom} already exists.`)
        };

        const result = await db.query(
            `UPDATE symptoms
            SET symptom = $1
            WHERE symptom_id = $2
            RETURNING   symptom_id AS "symptomId",
                        symptom`,
            [data.symptom, symptomId]);
        const symptom = result.rows[0];

        if (!symptom) throw new NotFoundError('No such symptom exists');
        return symptom;
    };

    /**Delete
     * inputs: symptomId
     * outputs: symptomId
     * NotFound error on symptom not found
     */

    static async delete(symptomId){
        let result = await db.query(
            `DELETE
            FROM symptoms
            WHERE symptom_id = $1
            RETURNING symptom_id AS "symptomId"`,
            [symptomId]);
        const symptom = result.rows[0]
        if (!symptom) throw new NotFoundError('No such symptom exists');
        return symptom;
    };

    /**UserConnect
     * inputs: userId, symptomId
     * outputs: {userId, symptomId, symptom}
     * NotFound error id symptom or user is not found
     * BadRequest error if symptom connection already exists
     */

    static async userConnect(userId, symptomId){
        const duplicateCheck = await db.query(
            `SELECT * 
            FROM users_symptoms
            WHERE user_id = $1 AND symptom_id = $2`,
            [userId, symptomId]
        );
        if (duplicateCheck.rows[0]){
            throw new BadRequestError(`This symptom has already been assigned to this user`);
        };

        const userResult = await db.query(
            `SELECT * 
            FROM users
            WHERE user_id = $1`,
            [userId]);
        const user = userResult.rows[0];
        if (!user) throw new NotFoundError('No such user exists');
        const symptomResult = await db.query(
            `SELECT * 
            FROM symptoms
            WHERE symptom_id = $1`,
            [symptomId]);
        const symptom = symptomResult.rows[0];
        if (!symptom) throw new NotFoundError('No such symptom exists');

        const result = await db.query(
            `INSERT INTO users_symptoms
            (user_id, symptom_id)
            VALUES ($1, $2)
            RETURNING user_id AS "userId", symptom_id AS "symptomId"`,
            [userId, symptomId]);
        const userSymptom = result.rows[0];
        return userSymptom;
    };

    /**UserGet
     * inputs: userId, symptomId
     * outputs: {userId, symptomId}
     * NotFound error if userSymptom is not found
     */

    static async userGet(userId, symptomId){
        const result = await db.query(
            `SELECT user_id AS "userId",
                    symptom_id AS "symptomId"
            FROM users_symptoms
            WHERE user_id = $1 AND symptom_id = $2`,
            [userId, symptomId]
        );
        const userSymptom = result.rows[0];
        if (!userSymptom) throw new NotFoundError('No such userSymptom exists');
        return userSymptom;
    }

    /**UserChange
     * inputs: userId, symptomId, {symptomId, symptom}
     * outputs: {userId, symptomId, symptom}
     * Replaces the existing symptom_id in the table with a new symptom id, 
     * with cascading change to all associated tracking records. 
     * NotFound error if userSymptom not found
     * BadRequest error if symptom connection already exists
     */

    static async userChange(userId, symptomId, data){
        const duplicateCheck = await db.query(
            `SELECT * FROM users_symptoms
            WHERE user_id = $1 AND symptom_id = $2`,
            [userId, data.newSymptomId]);
        if (duplicateCheck.rows[0]) {
            throw new BadRequestError('This symptom has already been assigned to this user');
        }
        const userResult = await db.query(
            `SELECT * FROM users WHERE user_id = $1`, [userId]);
        const user = userResult.rows[0];
        if (!user) throw new NotFoundError('No such user exists');
        const symptomResult = await db.query(
            `SELECT * FROM symptoms WHERE symptom_id = $1`, [data.newSymptomId]);
        const symptom = symptomResult.rows[0];
        if (!symptom) throw new NotFoundError('No such symptom exists');

        const result = await db.query(
            `UPDATE users_symptoms
            SET symptom_id = $1
            WHERE user_id = $2 AND symptom_id = $3
            RETURNING   user_id AS "userId",
                        symptom_id AS "symptomId"`, 
            [data.newSymptomId, userId, symptomId]);
        const userSymptom = result.rows[0];

        if (!userSymptom) throw new NotFoundError('No such userSymptom exists');
        return userSymptom;
    };

    /**UserDisconnect 
     * inputs: userId, symptomId
     * outputs: {userId, symptomId}
     * NotFound error if userSymptom not found
    */

    static async userDisconnect(userId, symptomId){
        let result = await db.query(
            `DELETE
            FROM users_symptoms
            WHERE user_id = $1 AND symptom_id = $2
            RETURNING   user_id AS "userId",
                        symptom_id AS "symptomId"`, [userId, symptomId]);
        const userSymptom = result.rows[0];
        if (!userSymptom) throw new NotFoundError('No such userSymptom exists');
        return userSymptom;
    };

    /*Track
     * inputs: {userId, symptomId, date, timespan, severity}
     * outputs: {userId, symptomId, date, timespan, dataTimestamp, severity}
     * NotFound error if userSymptom connection not found
     * BadRequest error with existing tracking record
    */
    
    static async track({userId, symptomId, trackDate, timespan, severity}){
        const duplicateCheck = await db.query(
            `SELECT * 
            FROM symptom_tracking
            WHERE user_id = $1 AND symptom_id = $2
            AND track_date = $3 AND timespan = $4`, 
            [userId, symptomId, trackDate, timespan]);
        if (duplicateCheck.rows[0]) throw new BadRequestError('That tracking record already exists');

        const userSymptomCheck = await db.query(
            `SELECT * 
            FROM users_symptoms
            WHERE user_id = $1 AND symptom_id = $2`,
            [userId, symptomId]);
        if (!userSymptomCheck.rows[0]) throw new NotFoundError('That symptom is not associated with that user');

        const result = await db.query(
            `INSERT INTO symptom_tracking
            (user_id, symptom_id, track_date, timespan, severity)
            VALUES ($1, $2, $3::DATE, $4, $5)
            RETURNING   symtrack_id AS "symtrackId",
                        user_id AS "userId",
                        symptom_id AS "symptomId",
                        track_date::DATE AS "trackDate",
                        timespan,
                        data_timestamp AS "dataTimestamp",
                        severity,
                        tracked_at AS "trackedAt"`,
            [userId, symptomId, trackDate, timespan, severity]);
        const trackingRecord = result.rows[0];
        return trackingRecord;
    };


    /**GetAllTracking
     * inputs: userId
     * outputs: [{userId, symptomId, date, timespan, dataTimestamp, severity}, ...]
     * NotFound error with invalid user
     */
    
    static async getAllTracking(userId){
        const user = await db.query(
            `SELECT user_id 
            FROM users
            WHERE user_id = $1`,[userId]);
        if (!user.rows[0]) throw new NotFoundError('No such user exists');
        const result = await db.query(
            `SELECT st.symtrack_id AS "symtrackId",
                    st.user_id AS "userId",
                    s.symptom,
                    st.track_date::DATE AS "trackDate",
                    st.timespan,
                    st.data_timestamp AS "dataTimestamp",
                    st.severity
            FROM symptom_tracking AS st
            INNER JOIN users_symptoms as us ON us.symptom_id = st.symptom_id
            INNER JOIN symptoms AS s ON st.symptom_id = s.symptom_id
            WHERE st.user_id = $1
            ORDER BY st.data_timestamp`,
                [userId]);
        if(!result.rows[0]) return [];
        return result.rows;
    };

    /**GetOneTracking
     * inputs: symtrackId
     * outputs: {userId, symptomId, date, timespan, severity}
     * NotFound error if tracking record not found
     */

    static async getOneTracking(symtrackId){
        const result = await db.query(
            `SELECT symtrack_id AS "symtrackId",
                    user_id AS "userId",
                    symptom_id AS "symptomId", 
                    track_date::DATE AS "trackDate", 
                    timespan,
                    data_timestamp AS "dataTimestamp",
                    severity
            FROM symptom_tracking
            WHERE symtrack_id = $1`,
            [symtrackId]);
        const trackingRecord = result.rows[0];
        if (!trackingRecord) throw new NotFoundError('No such tracking record exists');
        return trackingRecord;
    };

    /**GetDayTracking 
     * inputs: userId, date
     * outputs: [{userId, symptomId, date, timespan, severity}, ...]
     * Returns empty array for a day with no tracking records
     * NotFound error with invalid user
    */

    static async getDayTracking(userId, trackDate){
        const userCheck = await db.query(
            `SELECT user_id FROM users
            WHERE user_id = $1`,
            [userId]
        );
        if (!userCheck.rows[0]) throw new NotFoundError('No such user exists');
        const symptomArrayResult = await db.query(
            `SELECT s.symptom
            FROM symptoms AS s 
            INNER JOIN users_symptoms AS us on us.symptom_id = s.symptom_id
            WHERE us.user_id = $1
            ORDER BY s.symptom`, [userId]
        );
        let finalResults = {};
        if (!symptomArrayResult.rows) return finalResults;
        for (let symptom of symptomArrayResult.rows){
            finalResults[symptom.symptom] = {}
        };
        const result = await db.query(
            `SELECT st.symtrack_id AS "symtrackId",
                    st.user_id AS "userId",
                    s.symptom,
                    st.track_date::DATE AS "trackDate",
                    st.timespan,
                    st.data_timestamp AS "dataTimestamp",
                    st.severity
            FROM symptom_tracking AS st
            INNER JOIN users_symptoms as us ON us.symptom_id = st.symptom_id
            INNER JOIN symptoms AS s ON st.symptom_id = s.symptom_id
            WHERE st.user_id = $1 AND st.track_date = $2
            ORDER BY st.data_timestamp`,
                [userId, trackDate]);
        if (!result.rows[0]) return finalResults;
        for (let trackingRecord of result.rows){
            finalResults[trackingRecord.symptom][trackingRecord.timespan] = trackingRecord.severity;
        }
        return finalResults;
    };

    /**EditTracking
     * inputs: userId, symptomId, date, timespan, {severity}
     * outputs: {symtrackId, userId, symptomId, date, timespan, severity}
     * NotFound error with invalid tracking record
     */

    static async editTracking(userId, symptomId, trackDate, timespan, severity){
        const result = await db.query(
            `UPDATE symptom_tracking
            SET severity = $1, tracked_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 AND symptom_id = $3
            AND track_date = $4 AND timespan = $5
            RETURNING   symtrack_id AS "symtrackId",
                        user_id AS "userId", 
                        symptom_id AS "symptomId",
                        track_date::DATE AS "trackDate",
                        timespan,
                        data_timestamp AS "dataTimestamp",
                        severity,
                        tracked_at AS "trackedAt"`,
            [severity, userId, symptomId, trackDate, timespan]);
        const trackingRecord = result.rows[0];
        if (!trackingRecord) throw new NotFoundError('No such tracking record exists');
        return trackingRecord;
    };

    /**DeleteTracking
     * inputs: userId, symptomId, date, timespan
     * outputs: none
     * NotFound error with invalid tracking record
     */

    static async deleteTracking(symtrackId){
        let result = await db.query(
            `DELETE 
            FROM symptom_tracking
            WHERE symtrack_id = $1
            RETURNING symtrack_id AS "symtrackId"`,
            [symtrackId]);
        const trackingRecord = result.rows[0];
        if (!trackingRecord) throw new NotFoundError('No such tracking record exists');
        return trackingRecord;
    };

    /**DeleteDayTracking
     * inputs: userId, date
     * outputs: [{symtrackId}, ...]
     * NotFound error with invalid date
     */

    static async deleteDayTracking(userId, trackDate){
        let result = await db.query(
            `DELETE
            FROM symptom_tracking
            WHERE user_id = $1 AND track_date = $2
            RETURNING symtrack_id AS "symtrackId"`,
            [userId, trackDate]);
        const trackingRecords = result.rows[0];
        if (!trackingRecords) throw new NotFoundError('No such tracking records exist');
        return trackingRecords;
    };
};

module.exports = Symptom;