import log4js from 'log4js';
import config from '@/config/config';

const IS_DEV = config.isDev();
const LOG_PATH = config.getLogPath();

const logger_config = {
  appenders: {
    out: { type: 'stdout', layout: { type: 'coloured' } },
    surgbook: { type: 'dateFile', filename: LOG_PATH + '/api/surgbook.log', pattern: '.yyyy-MM-dd', compress: false, "backups": 30 },
    access: { type: 'dateFile', filename:  LOG_PATH + '/access/access.log', pattern: '.yyyy-MM-dd', compress: false, "backups": 7 }
  },
  categories: {
    default: { appenders: [ 'out', 'surgbook' ], level: IS_DEV ? 'DEBUG' : 'INFO' },
    access: { appenders: [ 'out', 'access' ], level: 'ALL' }
  }
};

log4js.configure(logger_config);

const app_logger = log4js.getLogger('default');
const getRequestUri = (request) => {
  return `[ ${request.method} ${request.originalUrl} ]\n`;
};

export default {
  express: log4js.connectLogger(log4js.getLogger('access'), {"level": "INFO"}),
  "d": (request, ...args) => {
    if (request){
      app_logger.debug(getRequestUri(request), ...args);
    } else {
      app_logger.debug(...args);
    }
  },

  "w": (request, ...args) => {
    if (request){
      app_logger.warn(getRequestUri(request), ...args);
    } else {
      app_logger.warn(...args);
    }
  },

  "i": (request, ...args) => {
    if (request){
      app_logger.info(getRequestUri(request), ...args);
    } else {
      app_logger.info(...args);
    }
  },

  "e": (request, ...args) => {
    if (request){
      app_logger.error(getRequestUri(request), ...args);
    } else {
      app_logger.error(...args);
    }
  },

  "debug": (...args) => {
    app_logger.debug(...args);
  },

  "error": (...args) => {
    app_logger.error(...args);
  }
}
