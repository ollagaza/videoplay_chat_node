import Util from '../../utils/baseutil';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import ServiceConfig from '../service-config'
import VacsStorageModel from '../../database/mysql/vacs/VacsStorageModel'

const VacsServiceClass = class {
  constructor() {
    this.log_prefix = '[CodeSceneClass]'
  }

  init = async () => {};

  getVacsStorageModel = (database = null) => {
    if (database) {
      return new VacsStorageModel(database)
    }
    return new VacsStorageModel(DBMySQL)
  }

  updateStorageStatusByApi = async (database, used, total) => {
    return await this.updateStorageStatus(database, used, total)
  }

  updateStorageStatusBySSH = async () => {
    const cmd = ServiceConfig.get('vacs_storage_info_cmd')
    const host = ServiceConfig.get('vacs_storage_ssh_host')
    const port = ServiceConfig.get('vacs_storage_ssh_port')
    const user = ServiceConfig.get('vacs_storage_ssh_user')
    const password = ServiceConfig.get('vacs_storage_ssh_password')

    const ssh_result = await Util.sshExec(cmd, host, port, user, password);
    if (ssh_result.success && ssh_result.result) {
      const storage_info = JSON.parse(ssh_result.result)
      const update_result = await this.updateStorageStatus(null, storage_info.used, storage_info.total)
      if (update_result.is_success) {

      }
    } else {
      log.error(this.log_prefix, '[]', ssh_result)
    }
  }

  updateStorageStatus = async (database, used, total) => {
    const used_size = Util.parseInt(used, null)
    const total_size = Util.parseInt(total, null)
    log.debug(this.log_prefix, '[updateStorageStatus] - input', used_size, total_size)
    if (used === null || total === null) {
      throw new StdObject(-2, '잘못된 요청입니다.', 400)
    }
    const vacs_storage_model = this.getVacsStorageModel(database)
    const update_result = await vacs_storage_model.updateStorageStatus(Util.today('yyyymmdd'), used_size, total_size)
    log.debug(this.log_prefix, '[updateStorageStatus] - result', used_size, total_size, update_result)
    return { used_size, total_size, is_success: update_result }
  }

  getLastStatus = async () => {
    const vacs_storage_model = this.getVacsStorageModel()
    return await vacs_storage_model.getCurrentStorageStatus()
  }

  getCurrentStorageStatus = async () => {
    const current_status = await this.getLastStatus()
    const result = { used_size: 0, total_size: 0, upload_count: 0, delete_count: 0 }
    if (current_status) {
      result.used_size = Util.parseInt(current_status.used_size, 0)
      result.total_size = Util.parseInt(current_status.total_size, 0)
      result.upload_count = Util.parseInt(current_status.upload_count, 0)
      result.delete_count = Util.parseInt(current_status.delete_count, 0)
    }
    return result
  }

  increaseCount = async (date, upload_count = 0, delete_count = 0) => {
    const today = Util.parseInt(Util.today('yyyymmdd'))
    const vacs_storage_model = this.getVacsStorageModel()
    const last_status = await this.getLastStatus()
    let last_date = null
    let used_size = 0
    let total_size = 0
    if (last_status) {
      last_date = Util.parseInt(last_status.state_date)
      used_size = Util.parseInt(last_status.used_size, 0)
      total_size = Util.parseInt(last_status.total_size, 0)
    }
    if (last_date !== today) {
      const update_result = await this.updateStorageStatus()
    }
  }
};

const vacs_service = new VacsServiceClass();
export default vacs_service;
