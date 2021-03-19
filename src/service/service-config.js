import DBMySQL from '../database/knex-mysql'
import ServiceConfigModel from '../database/mysql/service-config-model'
import SocketManager from './socket-manager'
import log from '../libs/logger'

const ServiceConfigClass = class {
  constructor () {
    this.log_prefix = '[ServiceConfigClass]'
    this.service_config_map = {}
    this.supporter_email_list = null
    SocketManager.on('onReloadServiceConfig', this.reload)
  }

  load_config = async () => {
    const service_config_model = new ServiceConfigModel(DBMySQL)
    const config_list = await service_config_model.find()

    this.service_config_map = {}

    if (config_list && config_list.length) {
      for (let i = 0; i < config_list.length; i++) {
        const config = config_list[i]
        this.service_config_map[config.key] = config.value
      }
    }

    if (this.service_config_map['supporter_email_list']) {
      this.supporter_email_list = JSON.parse(this.service_config_map['supporter_email_list'])
    }
    return true
  }

  init = async (callback) => {
    await this.load_config()
    if (callback) callback()
  }

  reload = async (callback) => {
    log.debug(this.log_prefix, '[reload]')
    await this.load_config()
    if (callback) callback()
  }

  getServiceInfo = () => {
    return this.service_config_map
  }

  get = (key) => {
    return this.service_config_map[key]
  }

  isVacs = () => {
    let is_vacs = this.service_config_map['is_vacs'] ? this.service_config_map['is_vacs'] : 'n'
    return is_vacs.toLowerCase() === 'y'
  }

  isVacsUseMachineId = () => {
    const use_machine_id = this.service_config_map['is_vacs'] ? this.service_config_map['is_vacs'] : 'n'
    return use_machine_id.toLowerCase() === 'y'
  }

  supporterEmailList = () => {
    return this.supporter_email_list
  }
}

const ServiceConfig = new ServiceConfigClass()

export default ServiceConfig
