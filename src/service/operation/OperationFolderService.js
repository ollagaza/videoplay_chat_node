import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import OperationService from '../operation/OperationService'
import OperationFolderModel from '../../database/mysql/operation/OperationFolderModel'
import OperationFolderInfo from '../../wrapper/operation/OperationFolderInfo'

const OperationFolderServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationFolderService]'
  }

  getOperationFolderModel = (database) => {
    if (database) {
      return new OperationFolderModel(database)
    }
    return new OperationFolderModel(DBMySQL)
  }

  getFolderInfo = async (database, group_seq, folder_seq) => {
    const model = this.getOperationFolderModel(database)
    return new OperationFolderInfo(await model.getFolderInfo(group_seq, folder_seq))
  }

  getParentFolderList = async (database, group_seq, parent_folder_list) => {
    if (!parent_folder_list) {
      return null
    }
    const model = this.getOperationFolderModel(database)
    const parent_list = await model.getParentFolders(group_seq, parent_folder_list)
    const result_list = []
    if (parent_list) {
      parent_list.forEach((parent_info) => {
        result_list.push(new OperationFolderInfo(parent_info))
      })
    }
    return result_list
  }

  getChildFolderList = async (database, group_seq, folder_seq) => {
    const model = this.getOperationFolderModel(database)
    const child_list = await model.getChildFolders(group_seq, folder_seq)
    const result_list = []
    if (child_list) {
      child_list.forEach((child_info) => {
        result_list.push(new OperationFolderInfo(child_info))
      })
    }
    return result_list
  }

  createOperationFolder = async (database, request_body, group_seq) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const parent_folder_info = request_body.parent_folder_info
    if (parent_folder_info) {
      folder_info.depth = parent_folder_info.depth + 1
      folder_info.parent_seq = parent_folder_info.seq
      folder_info.parent_folder_list = parent_folder_info.parent_folder_list
      folder_info.parent_folder_list.push(parent_folder_info.seq)
    } else {
      folder_info.depth = 0
      folder_info.parent_folder_list = []
    }
    folder_info.group_seq = group_seq

    const is_valid_name = await model.isValidFolderName(folder_info.folder_name, parent_folder_info ? parent_folder_info.seq : null)
    if (!is_valid_name) {
      throw new StdObject(-1, '이미 사용중인 폴더명입니다.', 400)
    }

    const folder_seq = await model.createOperationFolder(folder_info)
    folder_info.seq = folder_seq
    log.debug(this.log_prefix, '[createOperationFolder]', folder_seq, folder_info)

    return folder_info
  }

  updateOperationFolder = async (database, folder_seq, request_body) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const update_result = await model.updateOperationFolder(folder_seq, folder_info)
    return update_result
  }

  deleteOperationFolder = async (database, folder_seq) => {
    const model = this.getOperationFolderModel(database)
    const delete_result = await model.deleteOperationFolder(folder_seq)
    return delete_result
  }

  moveFolder = async (database, request_body) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const new_parent_info = new OperationFolderInfo(request_body.new_parent_info)
    const move_child_only = request_body.request_body === true
    const result = await model.moveFolder(folder_info, new_parent_info, move_child_only)
    return result
  }
}

const operation_folder_service = new OperationFolderServiceClass()
export default operation_folder_service
