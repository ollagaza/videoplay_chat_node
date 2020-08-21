import knex_config from '../config/knex.config'
import log from '../libs/logger'
import Config from '../config/config'
import Constants from '../constants/constants'

const LOG_PREFIX = '[MySQL]\n'

const ENV = Config.getEnv()
const PRINT_DB_LOG = Config.printDBLog()

const database_config = Config.isLocal() ? knex_config[Constants.LOCAL] : knex_config[ENV]
if (Config.getMySQLHost()) {
  database_config.connection.host = Config.getMySQLHost()
}
database_config.debug = true
database_config.log = {
  warn (message) {
    if (PRINT_DB_LOG) {
      log.warn(LOG_PREFIX, message)
    }
  },
  error (message) {
    log.error(LOG_PREFIX, message)
  },
  deprecate (message) {
    log.warn(LOG_PREFIX, message)
  },
  debug (message) {
    if (PRINT_DB_LOG) {
      log.debug(LOG_PREFIX, message)
    }
  },
}
log.info(LOG_PREFIX, 'connection config', database_config, Config.getMySQLHost())

const knex = require('knex')(database_config)

export default knex
