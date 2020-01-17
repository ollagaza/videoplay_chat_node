import DBMysql from '../database/knex-mysql'
import ServiceConfigModel from '../database/mysql/service-config-model'

let service_config = {};

const load_config = async () => {
  const service_config_model = new ServiceConfigModel( DBMysql );
  const config_list = await service_config_model.find();

  service_config = {};

  if (config_list && config_list.length) {
    for (let i = 0; i < config_list.length; i++) {
      const config = config_list[i];
      service_config[config.key] = config.value;
    }
  }
  return true;
};

export default {
  init: async (callback) => {
    await load_config();
    if (callback) callback();
  },

  reload: async (callback) => {
    await load_config();
    if (callback) callback();
  },

  getServiceInfo: () => {
    return service_config;
  },

  get: (key) => {
    return service_config[key];
  }
};
