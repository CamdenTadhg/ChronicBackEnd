"use strict";

const db = require('../db');
const {
    NotFoundError,
    BadRequestError
} = require('../expressError');
const {sqlForPartialUpdateArray} = require('../helpers/sql');


class Diagnosis{
    /**Create
     * inputs: {diagnosis, synonyms[]}
     * outputs: {diagnosisId, diagnosis, synonyms[]}
     * BadRequest error on duplicate diagnosis or synonym
     */

    static async create({diagnosisName, synonyms}){
        const duplicateCheckOne = await db.query(
            `SELECT diagnosis
            FROM diagnoses
            WHERE diagnosis ILIKE $1`,
            [diagnosisName]
        );
        const duplicateCheckTwo = await db.query(
            `SELECT diagnosis 
            FROM diagnoses
            WHERE $1 ILIKE ANY(synonyms)`,
            [diagnosisName]
        );
        if (duplicateCheckOne.rows[0] || duplicateCheckTwo.rows[0]){
            const suggestion = duplicateCheckOne.rows[0] || duplicateCheckTwo.rows[0]
            throw new BadRequestError(`Did you mean ${suggestion.diagnosis}?`);
        }
        //check also for duplication in synonyms
        if (synonyms){
            for (let synonym of synonyms){
                const duplicateCheckThree = await db.query(
                    `SELECT diagnosis
                    FROM diagnoses
                    WHERE diagnosis ILIKE $1`,
                    [synonym]
                );
                const duplicateCheckFour = await db.query(
                    `SELECT diagnosis
                    FROM diagnoses
                    WHERE $1 ILIKE ANY(synonyms)`,
                    [synonym]
                )
                if (duplicateCheckThree.rows[0] || duplicateCheckFour.rows[0]){
                    const suggestion = duplicateCheckThree.rows[0] || duplicateCheckFour.rows[0];
                    throw new BadRequestError(`Did you mean ${suggestion.diagnosis}?`)
                }
            }
        }
        const result = await db.query(
            `INSERT INTO diagnoses
            (diagnosis, synonyms)
            VALUES ($1, $2)
            RETURNING diagnosis_id AS "diagnosisId", diagnosis, synonyms`,
            [diagnosisName, synonyms]
        );
        const diagnosis = result.rows[0];
        return diagnosis
    };

    /**GetAll
     * inputs: none
     * outputs: [{diagnosisId, diagnosis, synonyms[]}, ...]
     */

        static async getAll(){
            const result = await db.query(
                `SELECT diagnosis_id AS "diagnosisId",
                        diagnosis,
                        synonyms 
                FROM diagnoses
                ORDER BY diagnosis`
            );
            return result.rows;
        };

    /**GetOne
     * inputs: diagnosisId
     * outputs: {diagnosisId, diagnosis, synonyms[]}
     */

    static async getOne(diagnosisId) {
        const result = await db.query(
            `SELECT diagnosis_id AS "diagnosisId",
                    diagnosis, 
                    synonyms 
            FROM diagnoses
            WHERE diagnosis_id = $1`,
            [diagnosisId]
        );
        const diagnosis = result.rows[0];
        if (!diagnosis) throw new NotFoundError('No such diagnosis exists');
        return diagnosis;
    };

    /**Edit
     * inputs: diagnosisId, {diagnosis, synonyms[]}
     * partial updates allowed
     * outputs: {diagnosisId, diagnosis, synonyms[]}
     * NotFound error if diagnosis not found
     */

    static async edit(diagnosisId, data){
        if (data.diagnosis) {
            const duplicateCheckOne = await db.query(
                `SELECT diagnosis
                FROM diagnoses
                WHERE diagnosis ILIKE $1`,
                [data.diagnosis]
            );
            const duplicateCheckTwo = await db.query(
                `SELECT diagnosis 
                FROM diagnoses
                WHERE $1 ILIKE ANY(synonyms)`,
                [data.diagnosis]
            );
            if (duplicateCheckOne.rows[0] || duplicateCheckTwo.rows[0]){
                const suggestion = duplicateCheckOne.rows[0] || duplicateCheckTwo.rows[0]
                throw new BadRequestError(`Did you mean ${suggestion.diagnosis}?`);
            };
        };
        
        const {setCols, values} = await sqlForPartialUpdateArray(
            data, {diagnosisId}, {});
        const idVarIdx = "$" + (values.length + 1);
        const diagnosisQuery = `UPDATE diagnoses
                                SET ${setCols}
                                WHERE diagnosis_id = ${idVarIdx}
                                RETURNING   diagnosis_id AS "diagnosisId",
                                            diagnosis,
                                            synonyms`;
        const result = await db.query(diagnosisQuery, [...values, diagnosisId]);
        const diagnosis = result.rows[0];

        if (!diagnosis) throw new NotFoundError('No such diagnosis exists');
        return diagnosis;
    };

    /**Delete
     * inputs: diagnosisId
     * outputs: diagnosisId
     * NotFound error if diagnosis not found
     */

    static async delete(diagnosisId) {
        let result = await db.query(
            `DELETE 
            FROM diagnoses
            WHERE diagnosis_id = $1
            RETURNING diagnosis_id AS "diagnosisId"`,
            [diagnosisId]);
        const diagnosis = result.rows[0];
        if (!diagnosis) throw new NotFoundError('No such diagnosis exists');
        return diagnosis;
    };

    /**UserConnect
     * inputs: userId, diagnosisId, {keywords[]}
     * output: {userId, diagnosisId, keywords[]}
     * NotFound error if diagnosis or user is not found
     * BadRequest error if diagnosis connection already exists
     */

    static async userConnect(userId, diagnosisId, data){
        const duplicateCheck = await db.query(
            `SELECT * 
            FROM users_diagnoses
            WHERE user_id = $1 AND diagnosis_id = $2`,
            [userId, diagnosisId]
        );
        if (duplicateCheck.rows[0]){
            throw new BadRequestError(`This diagnosis has already been assigned to this user`);
        };

        const user = await db.query(
            `SELECT * 
            FROM users
            WHERE user_id = $1`,
            [userId]);
        if (!user.rows[0]) throw new NotFoundError('No such user exists');
        const diagnosis = await db.query(
            `SELECT * 
            FROM diagnoses
            WHERE diagnosis_id = $1`,
            [diagnosisId]);
        if (!diagnosis.rows[0]) throw new NotFoundError('No such diagnosis exists');
        
        if (data.keywords.length === 1 && data.keywords[0] === ""){
            data.keywords = null;
        }
        const result = await db.query(
            `INSERT INTO users_diagnoses
            (user_id, diagnosis_id, keywords)
            VALUES ($1, $2, $3)
            RETURNING user_id AS "userId", diagnosis_id AS "diagnosisId", keywords`,
            [userId, diagnosisId, data.keywords]);
        const userDiagnosis = result.rows[0];
        return userDiagnosis;
    };

    /**UserGet
     * inputs: userId, diagnosisId
     * output: {userId, diagnosisId, keywords}
     * NotFound error if userDiagnosis record is not found
     */

    static async userGet(userId, diagnosisId){
        const result = await db.query(
            `SELECT user_id AS "userId",
                    diagnosis_id AS "diagnosisId",
                    keywords
            FROM users_diagnoses
            WHERE user_id = $1 AND diagnosis_id = $2`,
            [userId, diagnosisId]
        );
        const userDiagnosis = result.rows[0];
        if (!userDiagnosis) throw new NotFoundError('No such userDiagnosis exists');
        return userDiagnosis;
    }

    /**UserUpdate
     * inputs: userId, diagnosisId, {keywords[]}
     * output: {userId, diagnosisId, keywords}
     * NotFound error if userDiagnosis record is not found
     */

    static async userUpdate(userId, diagnosisId, data){
        const user = await db.query(
            `SELECT * 
            FROM users
            WHERE user_id = $1`,
            [userId]);
        if (!user.rows[0]) throw new NotFoundError('No such user exists');
        const diagnosis = await db.query(
            `SELECT * 
            FROM diagnoses
            WHERE diagnosis_id = $1`,
            [diagnosisId]);
        if (!diagnosis.rows[0]) throw new NotFoundError('No such diagnosis exists');
        
        const {setCols, values} = await sqlForPartialUpdateArray(
            data, {userId, diagnosisId}, {});
        const idVarIdx = "$" + (values.length + 1);
        const secondIdVarIdx = "$" + (values.length + 2);
        const userDiagnosisQuery = `UPDATE users_diagnoses
                                SET ${setCols}
                                WHERE diagnosis_id = ${idVarIdx} AND
                                user_id = ${secondIdVarIdx}
                                RETURNING   user_id AS "userId",
                                            diagnosis_id AS "diagnosisId",
                                            keywords`;
        const result = await db.query(userDiagnosisQuery, [...values, diagnosisId, userId]);
        const userDiagnosis = result.rows[0];

        if (!userDiagnosis) throw new NotFoundError('No such userDiagnosis exists');
        return userDiagnosis;
    };

    /**UserDisconnect
     * inputs: userId, diagnosisId
     * output: none
     * NotFound error if userDiagnosis record is not found
    */

    static async userDisconnect(userId, diagnosisId) {
        let result = await db.query(
            `DELETE 
            FROM users_diagnoses
            WHERE user_id = $1 AND diagnosis_id = $2
            RETURNING user_id, diagnosis_id`,
            [userId, diagnosisId]);
        const userDiagnosis = result.rows[0];
        if (!userDiagnosis) throw new NotFoundError('No such userDiagnosis exists');
        return userDiagnosis;
    };
};

module.exports = Diagnosis;