import knexfile from '@/knexfile';
const env = process.env.NODE_ENV;
const knex = require('knex')(knexfile[env]);

export default knex;