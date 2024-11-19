"use strict";

const db = require('../db');
const {
    NotFoundError,
    BadRequestError} = require('../expressError');

class Medication {
    /**Create
     * inputs: {medication}
     * outputs: {medId, medication}
     * BadRequest error on duplicate medication
     */
    static async create({medicationName}){
        const duplicateCheck = await db.query(
            `SELECT med_id
            FROM medications
            WHERE medication = $1`,
            [medicationName]
        );
        if (duplicateCheck.rows[0]){
            throw new BadRequestError(`${medicationName} already exists.`)
        };

        const result = await db.query(
            `INSERT INTO medications
            (medication)
            VALUES ($1)
            RETURNING med_id AS "medId", medication`,
            [medicationName]
        );
        const medication = result.rows[0];
        return medication;
    };

    /**GetAll
     * inputs: none
     * outputs: [{medId, medication}, ...]
     */

    static async getAll(){
        const result = await db.query(
            `SELECT med_id AS "medId",
                    medication
            FROM medications
            ORDER BY medication`
        );
        return result.rows;
    };

    /**GetOne
     * inputs: medId
     * outputs: {medId, medication}
     * NotFound error on medication not found
     */

    static async getOne(medId) {
        const result = await db.query(
            `SELECT med_id AS "medId",
                    medication
            FROM medications
            WHERE med_id = $1`,
            [medId]
        );
        const medication = result.rows[0];
        if (!medication) throw new NotFoundError('No such medication exists');
        return medication;
    };

    /**Edit
     * inputs: medId, {medication}
     * outputs: {medId, medication}
     * NotFound error on medication not found
     */

    static async edit(medId, data){
        const duplicateCheck = await db.query(
            `SELECT med_id
            FROM medications
            WHERE medication = $1`,
            [data.medication]
        );
        if (duplicateCheck.rows[0]){
            throw new BadRequestError(`${data.medication} already exists.`)
        };

        const result = await db.query(
            `UPDATE medications
            SET medication = $1
            WHERE med_id = $2
            RETURNING   med_id AS "medId",
                        medication`,
            [data.medication, medId]);
        const medication = result.rows[0];

        if (!medication) throw new NotFoundError('No such medication exists');
        return medication;
    };

    /**Delete
     * inputs: medId
     * outputs: medId
     * NotFound error on medication not found
     */

    static async delete(medId){
        let result = await db.query(
            `DELETE
            FROM medications
            WHERE med_id = $1
            RETURNING med_id AS "medId"`,
            [medId]);
        const medication = result.rows[0]
        if (!medication) throw new NotFoundError('No such medication exists');
        return medication;
    };

    /**UserConnect
     * inputs: userId, medId
     * outputs: {userId, medId, medication}
     * NotFound error if medication or user is not found
     * BadRequest error if medication connection already exists
     */

    static async userConnect(userId, medId, data){
        const duplicateCheck = await db.query(
            `SELECT * 
            FROM users_medications
            WHERE user_id = $1 AND med_id = $2`,
            [userId, medId]
        );
        if (duplicateCheck.rows[0]){
            throw new BadRequestError(`This medication has already been assigned to this user`);
        };

        const user = await db.query(
            `SELECT * 
            FROM users
            WHERE user_id = $1`,
            [userId]);
        if (!user.rows[0]) throw new NotFoundError('No such user exists');
        const medication = await db.query(
            `SELECT * 
            FROM medications
            WHERE med_id = $1`,
            [medId]);
        if (!medication.rows[0]) throw new NotFoundError('No such medication exists');

        const result = await db.query(
            `INSERT INTO users_medications
            (user_id, med_id, dosage_num, dosage_unit, time_of_day)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING   user_id AS "userId", 
                        med_id AS "medId",
                        dosage_num AS "dosageNum",
                        dosage_unit AS "dosageUnit", 
                        time_of_day AS "timeOfDay"`,
            [userId, medId, data.dosageNum, data.dosageUnit, data.timeOfDay]);
        const userMedication = result.rows[0];
        return userMedication;
    };

    /**UserGet
     * inputs: userId, medId
     * outputs: {userId, medId}
     * NotFound error if userMedication is not found
     */

    static async userGet(userId, medId){
        const result = await db.query(
            `SELECT user_id AS "userId",
                    med_id AS "medId",
                    dosage_num AS "dosageNum", 
                    dosage_unit AS "dosageUnit", 
                    time_of_day AS "timeOfDay"
            FROM users_medications
            WHERE user_id = $1 AND med_id = $2`,
            [userId, medId]
        );
        const userMedication = result.rows[0];
        if (!userMedication) throw new NotFoundError('This medication is not connected to this user');
        return userMedication;
    }

    /**UserChange
     * inputs: userId, medId, {medId, medication}
     * outputs: {userId, medId, medication}
     * Replaces the existing med_id in the table with a new medication id, 
     * with cascading change to all associated tracking records. 
     * NotFound error if userMedication not found
     * BadRequest error if medication connection already exists
     */

    static async userChange(userId, medId, data){
        const user = await db.query(
            `SELECT * FROM users WHERE user_id = $1`, [userId]);
        if (!user) throw new NotFoundError('No such user exists');
        let result;
        if (data.newMedId){
            const duplicateCheck = await db.query(
                `SELECT * FROM users_medications
                WHERE user_id = $1 AND med_id = $2`,
                [userId, data.newMedId]);
            if (duplicateCheck.rows[0]) {
                throw new BadRequestError('This medication has already been assigned to this user');
            }
            const medication = await db.query(
                `SELECT * FROM medications WHERE med_id = $1`, [data.newMedId]);
            if (!medication) throw new NotFoundError('No such medication exists');
            result = await db.query(
                `UPDATE users_medications
                SET med_id = $1,
                    dosage_num = $4,
                    dosage_unit = $5,
                    time_of_day = $6
                WHERE user_id = $2 AND med_id = $3
                RETURNING   user_id AS "userId",
                            med_id AS "medId",
                            dosage_num AS "dosageNum",
                            dosage_unit AS "dosageUnit", 
                            time_of_day AS "timeOfDay"`, 
                [data.newMedId, userId, medId, data.dosageNum, data.dosageUnit, data.timeOfDay]);
        } else {
            result = await db.query(
                `UPDATE users_medications 
                SET dosage_num = $1,
                dosage_unit = $2,
                time_of_day = $3
                WHERE user_id = $4 AND med_id = $5
                RETURNING   user_id AS "userId",
                            med_id AS "medId",
                            dosage_num AS "dosageNum", 
                            dosage_unit AS "dosageUnit",
                            time_of_day AS "timeOfDay"`,
                [data.dosageNum, data.dosageUnit, data.timeOfDay, userId, medId]
            )
        }
        const userMedication = result.rows[0];

        if (!userMedication) throw new NotFoundError('This medication is not connected to this user');
        return userMedication;
    };

    /**UserDisconnect 
     * inputs: userId, medId
     * outputs: {userId, medId}
     * NotFound error if userMedication not found
    */

    static async userDisconnect(userId, medId){
        let result = await db.query(
            `DELETE
            FROM users_medications
            WHERE user_id = $1 AND med_id = $2
            RETURNING   user_id AS "userId",
                        med_id AS "medId"`, [userId, medId]);
        const userMedication = result.rows[0];
        if (!userMedication) throw new NotFoundError('This medication is not connected to this user');
        return userMedication;
    };

    /*Track
     * inputs: {userId, medId, date, timeOfDay, number}
     * outputs: {userId, medId, date, timeOfDay, number}
     * NotFound error if userMedication connection not found
     * BadRequest error with existing tracking record
    */
    
    static async track({userId, medId, trackDate, timeOfDay, number}){
        const duplicateCheck = await db.query(
            `SELECT * 
            FROM medication_tracking
            WHERE user_id = $1 AND med_id = $2
            AND track_date = $3 AND time_of_day = $4`, 
            [userId, medId, trackDate, timeOfDay]);
        if (duplicateCheck.rows[0]) throw new BadRequestError('That tracking record already exists');

        const userMedicationCheck = await db.query(
            `SELECT * 
            FROM users_medications
            WHERE user_id = $1 AND med_id = $2`,
            [userId, medId]);
        if (!userMedicationCheck.rows[0]) throw new NotFoundError('That medication is not associated with that user');

        const result = await db.query(
            `INSERT INTO medication_tracking
            (user_id, med_id, track_date, time_of_day, number)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING   medtrack_id AS "medtrackId",
                        user_id AS "userId",
                        med_id AS "medId",
                        track_date AS "trackDate",
                        time_of_day AS "timeOfDay",
                        data_timestamp AS "dataTimestamp",
                        number,
                        tracked_at AS "trackedAt"`,
            [userId, medId, trackDate, timeOfDay, number]);
        const trackingRecord = result.rows[0];
        return trackingRecord;
    };


    /**GetAllTracking
     * inputs: userId
     * outputs: [{userId, medId, date, timeOfDay, number}, ...]
     * NotFound error with invalid user
     */
    
    static async getAllTracking(userId){
        const user = await db.query(
            `SELECT user_id 
            FROM users
            WHERE user_id = $1`,[userId]);
        if (!user) throw new NotFoundError('No such user exists');
        const result = await db.query(
            `SELECT mt.medtrack_id AS "medtrackId",
                    mt.user_id AS "userId",
                    m.medication,
                    mt.track_date AS "trackDate",
                    mt.time_of_day AS "timeOfDay",
                    mt.data_timestamp AS "dataTimestamp",
                    mt.number
            FROM medication_tracking AS mt
            INNER JOIN users_medications as um ON um.med_id = mt.med_id
            INNER JOIN medications AS m ON mt.med_id = m.med_id
            WHERE mt.user_id = $1
            ORDER BY mt.data_timestamp`,
                [userId]);
        if(!result.rows[0]) return [];
        return result.rows;
    };

    /**GetOneTracking
     * inputs: medtrackId
     * outputs: {userId, medId, date, timeOfDay, number}
     * NotFound error if tracking record not found
     */

    static async getOneTracking(medtrackId){
        const result = await db.query(
            `SELECT medtrack_id AS "medtrackId",
                    user_id AS "userId",
                    med_id AS "medId", 
                    track_date AS "trackDate", 
                    time_of_day AS "timeOfDay",
                    data_timestamp AS "dataTimestamp",
                    number
            FROM medication_tracking
            WHERE medtrack_id = $1`,
            [medtrackId]);
        const trackingRecord = result.rows[0];
        if (!trackingRecord) throw new NotFoundError('No such tracking record exists');
        return trackingRecord;
    };

    /**GetDayTracking 
     * inputs: userId, date
     * outputs: [{userId, medId, date, timeOfDay, number}, ...]
     * Returns empty array for a day with no tracking records
     * NotFound error with invalid user
    */

    static async getDayTracking(userId, trackDate){
        const userCheck = await db.query(
            `SELECT user_id FROM users
            WHERE user_id = $1`,
            [userId]
        );
        if (!userCheck) throw new NotFoundError('No such user exists');
        const medicationArrayResult = await db.query(
            `SELECT um.time_of_day AS "timeOfDay", m.medication
            FROM medications AS m
            INNER JOIN users_medications AS um on um.med_id = m.med_id
            WHERE um.user_id = $1
            ORDER BY m.medication`, [userId]);
        let finalResults = {
            AM: {},
            Midday: {},
            PM: {},
            Evening: {}
        };
        if (!medicationArrayResult.rows) return finalResults;
        for (let medication of medicationArrayResult.rows){
            if (medication.timeOfDay.includes('AM')){
                finalResults.AM[medication.medication] = null;
            }
            if (medication.timeOfDay.includes('Midday')){
                finalResults.Midday[medication.medication] = null;
            }
            if (medication.timeOfDay.includes('PM')) {
                finalResults.PM[medication.medication] = null;
            }
            if (medication.timeOfDay.includes('Evening')){
                finalResults.Evening[medication.medication] = null;
            }
        }
        const result = await db.query(
            `SELECT mt.medtrack_id AS "medtrackId",
                    mt.user_id AS "userId",
                    m.medication,
                    mt.track_date AS "trackDate",
                    mt.time_of_day AS "timeOfDay",
                    mt.data_timestamp AS "dataTimestamp",
                    mt.number
            FROM medication_tracking AS mt
            INNER JOIN users_medications as um ON um.med_id = mt.med_id
            INNER JOIN medications AS m ON mt.med_id = m.med_id
            WHERE mt.user_id = $1 AND mt.track_date = $2
            ORDER BY mt.data_timestamp`,
                [userId, trackDate]);
        if (!result.rows[0]) return finalResults;
        for (let trackingRecord of result.rows){
            finalResults[trackingRecord.timeOfDay][trackingRecord.medication] = trackingRecord.number;
        }
        return finalResults;
    };

    /**EditTracking
     * inputs: userId, medId, date, timeOfDay, {number}
     * outputs: {medtrackId, userId, medId, date, timeOfDay, number}
     * NotFound error with invalid tracking record
     */

    static async editTracking(userId, medId, trackDate, timeOfDay, number){
        const result = await db.query(
            `UPDATE medication_tracking
            SET number = $1, tracked_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 AND med_id = $3
            AND track_date = $4 AND time_of_day = $5
            RETURNING   medtrack_id AS "medtrackId",
                        user_id AS "userId", 
                        med_id AS "medId",
                        track_date AS "trackDate",
                        time_of_day AS "timeOfDay",
                        data_timestamp AS "dataTimestamp",
                        number,
                        tracked_at AS "trackedAt"`,
            [number, userId, medId, trackDate, timeOfDay]);
        const trackingRecord = result.rows[0];
        if (!trackingRecord) throw new NotFoundError('No such tracking record exists');
        return trackingRecord;
    };

    /**DeleteTracking
     * inputs: userId, medtrackId
     * outputs: none
     * NotFound error with invalid tracking record
     */

    static async deleteTracking(userId, medTrackId){
        let result = await db.query(
            `DELETE 
            FROM medication_tracking
            WHERE user_id = $1 AND medtrack_id = $2
            RETURNING medtrack_id AS "medtrackId"`,
            [userId, medTrackId]);
        const trackingRecord = result.rows[0];
        if (!trackingRecord) throw new NotFoundError('No such tracking record exists');
        return trackingRecord;
    };

    /**DeleteDayTracking
     * inputs: userId, date
     * outputs: [{medtrack_id}, ...]
     * NotFound error with invalid date
     */

    static async deleteDayTracking(userId, trackDate){
        let result = await db.query(
            `DELETE
            FROM medication_tracking
            WHERE user_id = $1 AND track_date = $2
            RETURNING medtrack_id AS "medtrackId"`,
            [userId, trackDate]);
        const trackingRecords = result.rows;
        if (!trackingRecords[0]) throw new NotFoundError('No such tracking records exist');
        return trackingRecords;
    };
};

module.exports = Medication;