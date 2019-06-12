const ENV = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const IS_DEV = ENV === 'development';
const LOG_PATH = process.env.LOG_PATH ? process.env.LOG_PATH : 'logs';

export default {
  getEnv: () => {
    return ENV;
  },

  isDev: () => {
    return IS_DEV;
  },

  getLogPath: () => {
    return LOG_PATH;
  }
};
