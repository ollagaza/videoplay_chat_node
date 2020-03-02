import knex_config from '../config/knex.config'
import log from '../libs/logger'
import Config from '../config/config'
import Constants from '../constants/constants'

const ENV = Config.getEnv()
const PRINT_DB_LOG = Config.printDBLog()

const database_config = Config.isLocal() ? knex_config[Constants.LOCAL] : knex_config[ENV]
database_config.debug = true
database_config.log = {
  warn (message) {
    if (PRINT_DB_LOG) {
      log.w(null, 'knex\n', message)
    }
  },
  error (message) {
    log.e(null, 'knex\n', message)
  },
  deprecate (message) {
    log.w(null, 'knex\n', message)
  },
  debug (message) {
    if (PRINT_DB_LOG) {
      log.d(null, 'knex\n', message)
    }
  },
}

const knex = require('knex')(database_config)

export default knex
