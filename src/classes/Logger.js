import log4js from 'log4js';

const IS_DEV = process.env.NODE_ENV === 'development';
const logger_config = {
  appenders: {
    out: { type: 'stdout', layout: { type: 'coloured' } },
    surgbook: { type: 'dateFile', filename: 'logs/surgbook.log', pattern: '.yyyy-MM-dd', compress: false },
    access: { type: 'dateFile', filename: 'logs/access.log', pattern: '.yyyy-MM-dd', compress: false, "backups": 7 }
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
  }
}
