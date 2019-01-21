import log4js from 'log4js';

const logger_config = {
  appenders: {
    out: { type: 'stdout', layout: { type: 'coloured' } },
    file: { type: 'dateFile', filename: '/logs/surgbook.log', pattern: '.yyyy-MM-dd', compress: false }
  },
  categories: {
    default: { appenders: [ 'out', 'file' ], level: 'debug' }
  }
};

const logger = log4js.getLogger();
log4js.configure(logger_config);

const getRequestUri = (request) => {
  return `[ ${request.method} ${request.originalUrl} ]\n`;
};

export default {
  "d": (request, ...args) => {
    if (request){
      logger.debug(getRequestUri(request), ...args);
    } else {
      logger.debug(...args);
    }
  },

  "w": (request, ...args) => {
    if (request){
      logger.warn(getRequestUri(request), ...args);
    } else {
      logger.warn(...args);
    }
  },

  "i": (request, ...args) => {
    if (request){
      logger.info(getRequestUri(request), ...args);
    } else {
      logger.info(...args);
    }
  },

  "e": (request, ...args) => {
    if (request){
      logger.error(getRequestUri(request), ...args);
    } else {
      logger.error(...args);
    }
  }
}
