const ENV = process.env.NODE_ENV === 'development' ? 'development' : 'production'
const IS_RELEASE = ENV === 'production'
const IS_DEV = ENV === 'development'
const LOG_PATH = process.env.LOG_PATH ? process.env.LOG_PATH : 'logs'
const LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : null
const IS_DEMON = process.env.SERVER_MODE === 'demon'
const PRINT_DB_LOG = process.env.PRINT_DB_LOG === true || process.env.PRINT_DB_LOG === 'true'
const IS_LOCAL = process.env.LOCAL === true || process.env.LOCAL === 'true'

console.log('ENV:', ENV)
console.log('IS_RELEASE:', IS_RELEASE)
console.log('IS_DEV:', IS_DEV)
console.log('LOG_PATH:', LOG_PATH)
console.log('IS_DEMON:', IS_DEMON)
console.log('PRINT_DB_LOG:', PRINT_DB_LOG)
console.log('IS_LOCAL:', IS_LOCAL)

export default {
  getEnv: () => {
    return ENV
  },

  isRelease: () => {
    return IS_RELEASE
  },

  isDev: () => {
    return IS_DEV
  },

  isDemon: () => {
    return IS_DEMON
  },

  isLocal: () => {
    return IS_LOCAL
  },

  printDBLog: () => {
    return PRINT_DB_LOG
  },

  getLogPath: () => {
    return LOG_PATH
  },

  getLogLevel: () => {
    return LOG_LEVEL
  }
}
