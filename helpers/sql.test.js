process.env.NODE_ENV === "test"

const {sqlForPartialUpdate} = require('./sql')
const { BadRequestError } = require("../expressError");


describe("sqlForPartialUpdate", function () {
    test("works: user", function () {
        const data = {cat: "requin", age: 17, color: 'gray', numLegs: 4};
        const translation = {numLegs: "num_legs"};
        const {setCols, values} = sqlForPartialUpdate(data, translation)
        
        expect(setCols).toEqual('"cat"=$1, "age"=$2, "color"=$3, "num_legs"=$4');
        expect(values).toEqual(['requin', 17, 'gray', 4]);
    });
  
    test("BadRequestError on no data", function () {
        try{
            const data = {};
            const translation = {firstName: "first_name", lastName: "last_name", isAdmin: "is_admin"};
            const {setCols, values} = sqlForPartialUpdate(data, translation)
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
  });

  describe("sqlForPartialUpdateArray", function () {
    test("works: user", function () {
        const data = {cat: "requin", age: 17, color: 'gray', numLegs: 4, synonyms: ['sharky']};
        const translation = {numLegs: "num_legs"};
        const {setCols, values} = sqlForPartialUpdate(data, translation)
        
        expect(setCols).toEqual('"cat"=$1, "age"=$2, "color"=$3, "num_legs"=$4, "synonyms"=$5');
        expect(values).toEqual(['requin', 17, 'gray', 4, ['sharky']]);
    });
  
    test("BadRequestError on no data", function () {
        try{
            const data = {};
            const translation = {firstName: "first_name", lastName: "last_name", isAdmin: "is_admin"};
            const {setCols, values} = sqlForPartialUpdate(data, translation)
        } catch(err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
  });