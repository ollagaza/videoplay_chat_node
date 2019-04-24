import knexfile from '@/knexfile';
import log from "@/classes/Logger";
import config from "@/config/config";

const ENV = config.getEnv();
const IS_DEV = config.isDev();

const database_config = knexfile[ENV];
database_config.debug = true;
database_config.log = {
  warn(message) {
    if (IS_DEV) {
      log.w(null, 'knex\n', message);
    }
  },
  error(message) {
    log.e(null, 'knex\n', message);
  },
  deprecate(message) {
    log.w(null, 'knex\n', message);
  },
  debug(message) {
    if (IS_DEV) {
      log.d(null, 'knex\n', message);
    }
  },
};

const knex = require('knex')(database_config);

export default knex;
