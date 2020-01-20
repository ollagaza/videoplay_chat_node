import DBMySQL from '../database/knex-mysql'
import ServiceConfigModel from '../database/mysql/service-config-model'

const ServiceConfigClass = class {
  constructor () {
    this.service_config_map = {}
  }

  load_config = async () => {
    const service_config_model = new ServiceConfigModel( DBMySQL );
    const config_list = await service_config_model.find();

    this.service_config_map = {};

    if (config_list && config_list.length) {
      for (let i = 0; i < config_list.length; i++) {
        const config = config_list[i];
        this.service_config_map[config.key] = config.value;
      }
    }
    return true;
  }

  init = async (callback) => {
    await this.load_config();
    if (callback) callback();
  }

  reload = async (callback) => {
    await this.load_config();
    if (callback) callback();
  }

  getServiceInfo = () => {
    return this.service_config_map;
  }

  get = (key) => {
    return this.service_config_map[key];
  }
}

const service_config = new ServiceConfigClass()

export default service_config
