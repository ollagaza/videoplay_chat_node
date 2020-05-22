import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import log from "../../../libs/logger"
import OperationFolderInfo from '../../../wrapper/operation/OperationFolderInfo'

export default class OperationFolderModel extends MySQLModel {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_folder'
    this.selectable_fields = ['*']
  }

  createOperationFolder = async (folder_info) => {
    folder_info.setIgnoreEmpty(true)
    folder_info.addPrivateKey('seq')
    const create_params = folder_info.toJSON()
    create_params.reg_date = this.database.raw('NOW()')
    create_params.modify_date = this.database.raw('NOW()')

    return await this.create(create_params, 'seq')
  }

  deleteOperationFolder = async (folder_seq) => {
    return await this.delete({ seq: folder_seq })
  }

  updateOperationFolder = async (folder_seq, folder_info) => {
    folder_info.addPrivateKey('seq')
    const update_params = folder_info.toJSON()
    update_params.modify_date = this.database.raw('NOW()')
    if (update_params.access_users && typeof update_params.access_users === 'object') {
      update_params.access_users = JSON.stringify(update_params.access_users)
    }
    return await this.update({ seq: folder_seq }, update_params)
  }
}
