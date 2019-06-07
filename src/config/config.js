const ENV = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const IS_DEV = ENV === 'development';

export default {
  getEnv: () => {
    return ENV;
  },

  isDev: () => {
    return IS_DEV;
  }
};
