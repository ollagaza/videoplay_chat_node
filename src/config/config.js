const ENV = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const IS_DEV = ENV === 'development';
const LOG_PATH = process.env.LOG_PATH ? process.env.LOG_PATH : 'logs';
const IS_DEMON = process.env.SERVER_MODE === 'demon';

console.log('ENV:', ENV);
console.log('IS_DEV:', IS_DEV);
console.log('LOG_PATH:', LOG_PATH);
console.log('IS_DEMON:', IS_DEMON);

export default {
  getEnv: () => {
    return ENV;
  },

  isDev: () => {
    return IS_DEV;
  },

  isDemon: () => {
    return IS_DEMON;
  },

  getLogPath: () => {
    return LOG_PATH;
  }
};
