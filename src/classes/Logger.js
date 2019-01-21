import log4js from 'log4js';

const logger_config = {
  appenders: {
    out: { type: 'stdout', layout: { type: 'coloured ' } },
    file: { type: 'dateFile', filename: '/logs/surgbook.log', pattern: '.yyyy-MM-dd', compress: false, layout: { type: 'coloured ' } }
  },
  categories: {
    default: { appenders: [ 'out', 'file' ], level: 'debug' }
  }
};

const logger = log4js.getLogger();
log4js.configure(logger_config);

export default {
  "d": (...args) => {
    logger.debug(...args);
  },

  "e": (...args) => {
    logger.error(...args);
  }
}
