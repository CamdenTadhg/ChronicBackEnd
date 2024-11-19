const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");

/** Helper function supporting update methods. Takes in partial data set for a resource 
 * and returns sections of a valid SQL update query. 
 * 
 * Input: 
 *  dataToUpdate: object with data values meant for updating a single resource
 *      example: {password: 'securepassword', email: 'theenbydeveloper@gmail.com'}
 *  jsToSql: object translating variable names from javascript convention to SQL convention
 *      example:{firstName: "first_name", lastName: "last_name", isAdmin: "is_admin"}
 * 
 * Output: 
 *  setCols: string in valid SQL of columns to update
 *      example: "password" = $1, "email" = $2
 *  values: object of values to update in same order as columns
 *      example: ['lasgdoiwonvwoihovihweovwioew', 'theenbydeveloper@gmail.com]
 * 
 * Errors: 
 * If an empty dataToUpdate object is passed into function, it returns a BadRequestError
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

/**Helper function same as above supporting update methods where there are arrays. Takes in partial data set for a resource and returns sections of a valid SQL update query. 
 * 
 * Input: 
 *  dataToUpdate: object with data values meant for updating a single resource
 *      example: {password: 'securepassword', email: 'theenbydeveloper@gmail.com'}
 *  jsToSql: object translating variable names from javascript convention to SQL convention
 *      example:{firstName: "first_name", lastName: "last_name", isAdmin: "is_admin"}
 * 
 * Output: 
 *  setCols: string in valid SQL of columns to update
 *      example: "password" = $1, "email" = $2
 *  values: object of values to update in same order as columns
 *      example: ['lasgdoiwonvwoihovihweovwioew', 'theenbydeveloper@gmail.com]
 * 
 * Errors: 
 * If an empty dataToUpdate object is passed into function, it returns a BadRequestError
 */

async function sqlForPartialUpdateArray(dataToUpdate, idData,  jsToSql){
  const keys = Object.keys(dataToUpdate)
  if (keys.length === 0) throw new BadRequestError("No data");

  let fullArray;
  if (keys.includes('synonyms') || keys.includes('keywords')){
    let arrayKey;
    let table;
    let id;
    let idArray = [];
    let errorMessage = '';
    if (keys.includes('synonyms')) {
      arrayKey = 'synonyms';
      table = 'diagnoses';
      id = `diagnosis_id = $1`;
      idArray.push(idData.diagnosisId)
      errorMessage = 'No such diagnosis exists'
    };
    if (keys.includes('keywords')) {
      arrayKey = 'keywords';
      table = 'users_diagnoses';
      id = `user_id = $1 AND diagnosis_id = $2`;
      idArray.push(idData.userId);
      idArray.push(idData.diagnosisId);
      errorMessage = 'No such userDiagnosis exists'
    };
    let newValues = dataToUpdate.synonyms || dataToUpdate.keywords;
    const oldArrayQuery = `SELECT ${arrayKey} FROM ${table} WHERE ${id}`;
    const fullArrayResult = await db.query(oldArrayQuery, [...idArray]);
    if (!fullArrayResult.rows[0]) throw new NotFoundError(errorMessage);
    fullArray = fullArrayResult.rows[0][arrayKey];
    if (fullArray === null){
      fullArray = [];
    }
    for (let value of newValues){
      fullArray.push(value);
    }
    dataToUpdate = {...dataToUpdate, [arrayKey]: fullArray}
  }
  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}


module.exports = { sqlForPartialUpdate, sqlForPartialUpdateArray };