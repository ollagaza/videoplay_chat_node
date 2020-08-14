const ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'production'
const IS_RELEASE = ENV === 'production'
const IS_VACS = ENV === 'vacs'
const IS_DEV = ENV === 'development' || IS_VACS
const LOG_PATH = process.env.LOG_PATH ? process.env.LOG_PATH : 'logs'
const LOG_LEVEL = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : null
const IS_DEMON = process.env.SERVER_MODE === 'demon'
const PRINT_DB_LOG = process.env.PRINT_DB_LOG === true || process.env.PRINT_DB_LOG === 'true'
const IS_LOCAL = process.env.LOCAL === true || process.env.LOCAL === 'true'

const config_info = {
  ENV,
  IS_RELEASE,
  IS_DEV,
  IS_VACS,
  IS_LOCAL,
  IS_DEMON,
  PRINT_DB_LOG,
  LOG_PATH
}

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

  isVacs: () => {
    return IS_VACS
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
  },

  getConfigInfo: () => {
    return config_info
  }
}
