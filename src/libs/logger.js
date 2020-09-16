import log4js from 'log4js'
import Config from '../config/config'

const IS_DEV = Config.isDev()
const LOG_PATH = Config.getLogPath()
const LOG_LEVEL = Config.getLogLevel()
const log_level = LOG_LEVEL ? LOG_LEVEL : (IS_DEV ? 'DEBUG' : 'INFO')

const logger_config = {
  appenders: {
    out: { type: 'stdout', layout: { type: 'coloured' } },
    app: { type: 'dateFile', filename: LOG_PATH + '/app.log', pattern: '.yyyy-MM-dd', compress: false, 'backups': 30 },
    access: {
      type: 'dateFile',
      filename: LOG_PATH + '/access.log',
      pattern: '.yyyy-MM-dd',
      compress: false,
      'backups': 7
    }
  },
  categories: {
    default: { appenders: ['out', 'app'], level: log_level },
    access: { appenders: ['out', 'access'], level: 'ALL' }
  },
  pm2: true,
  pm2InstanceVar: 'INSTANCE_ID'
}
log4js.configure(logger_config)

const app_logger = log4js.getLogger('default')
const getRequestUri = (request) => {
  return `[ ${request.method} ${request.originalUrl} ]\n`
}
app_logger.info(Config.getConfigInfo())

export default {
  express: log4js.connectLogger(log4js.getLogger('access'), { 'level': 'INFO' }),
  'd': (request, ...args) => {
    if (request) {
      app_logger.debug(getRequestUri(request), ...args)
    } else {
      app_logger.debug(...args)
    }
  },

  'w': (request, ...args) => {
    if (request) {
      app_logger.warn(getRequestUri(request), ...args)
    } else {
      app_logger.warn(...args)
    }
  },

  'i': (request, ...args) => {
    if (request) {
      app_logger.info(getRequestUri(request), ...args)
    } else {
      app_logger.info(...args)
    }
  },

  'e': (request, ...args) => {
    if (request) {
      app_logger.error(getRequestUri(request), ...args)
    } else {
      app_logger.error(...args)
    }
  },

  'debug': (...args) => {
    app_logger.debug(...args)
  },

  'warn': (...args) => {
    app_logger.warn(...args)
  },

  'info': (...args) => {
    app_logger.info(...args)
  },

  'error': (...args) => {
    app_logger.error(...args)
  }
}
