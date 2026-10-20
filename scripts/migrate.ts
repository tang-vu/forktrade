import {database,mode} from '../src/server/database';
const connection=database();
console.log(`Migrations applied successfully (${mode()} mode). No fixtures were seeded and no records were deleted.`);
connection.sqlite.close();
