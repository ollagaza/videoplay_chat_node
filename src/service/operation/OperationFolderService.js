import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import util from "../../utils/Util";
import OperationService from '../operation/OperationService'
import OperationModel from "../../database/mysql/operation/OperationModel";
import OperationFolderModel from '../../database/mysql/operation/OperationFolderModel'
import OperationFolderInfo from '../../wrapper/operation/OperationFolderInfo'
import OperationStorageModel from '../../database/mysql/operation/OperationStorageModel'
import Util from '../../utils/Util'

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

  getGroupFolderInfo = async (database, group_seq, request) => {
    const request_query = request.query ? request.query : {}
    const filter_params = {}
    filter_params.menu = request_query.menu

    const model = this.getOperationFolderModel(database)
    const result_list = await model.getGroupFolders(group_seq)
    const folder_map = {}
    let last_update = null
    result_list.forEach((result) => {
      const folder_info = new OperationFolderInfo(result)
      const seq = folder_info.seq
      const str_seq = `folder_${seq}`
      folder_map[str_seq] = folder_info
      if (!last_update || last_update < folder_info.modify_date) {
        last_update = folder_info.modify_date
      }
    })

    // log.debug(this.log_prefix, folder_map)
    this.makeFolderTree(folder_map)

    return {
      folder_map,
      // folder_tree: this.makeFolderTree(folder_map),
      last_update
    }
  }

  makeFolderTree = (folder_map) => {
    // const folder_map = {}
    // Object.keys(origin_folder_map).forEach((key) => {
    //   folder_map[key] = origin_folder_map[key].toJSON()
    // })
    const folder_tree = {}
    Object.keys(folder_map).forEach((key) => {
      const folder_info = folder_map[key]
      const seq = folder_info.seq
      const parent_seq = folder_info.parent_seq

      const str_seq = `folder_${seq}`
      const str_parent_seq = `folder_${parent_seq}`
      if (parent_seq) {
        if (folder_map[str_parent_seq]) {
          if (!folder_map[str_parent_seq].children) {
            folder_map[str_parent_seq].children = {}
          }
          folder_map[str_parent_seq].children[str_seq] = folder_info
        }
      } else {
        folder_tree[str_seq] = folder_info
      }
    })

    return folder_tree
  }

  getGroupFolderLastUpdate = async (database, group_seq) => {
    const model = this.getOperationFolderModel(database)
    const query_result = await model.getGroupFolderLastUpdate(group_seq)
    return query_result ? query_result.modify_date : null
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

  getChildAllFolderList = async (database, group_seq, folder_seq) => {
    const model = this.getOperationFolderModel(database)
    const allChildFolders = await model.getAllChildFolders(group_seq, folder_seq, true)

    return allChildFolders;
  }

  getAllChildFolderSeqListBySeqList = async (database, group_seq, folder_seq_list) => {
    let child_folder_list;
    const child_folder_seq_list = [];
    for (let i = 0; i < folder_seq_list.length; i++) {
      child_folder_list = await this.getChildAllFolderList(database, group_seq, folder_seq_list[i])
      for (let cnt = 0; cnt < child_folder_list.length; cnt++) {
        child_folder_seq_list.push(child_folder_list[cnt].seq);
      }
    }

    return child_folder_seq_list;
  }

  createDefaultOperationFolder = async (database, group_seq, member_seq) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo();
    folder_info.folder_name = '기본폴더';
    folder_info.depth = 0
    folder_info.parent_folder_list = []
    folder_info.group_seq = group_seq
    folder_info.member_seq = member_seq

    const folder_seq = await model.createOperationFolder(folder_info)
    folder_info.seq = folder_seq
    log.debug(this.log_prefix, '[createDefaultOperationFolder]', folder_seq, folder_info)

    return folder_info
  }

  createOperationFolder = async (database, request_body, group_seq, member_seq) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const parent_folder_info = request_body.parent_folder_info
    if (parent_folder_info) {
      folder_info.depth = parent_folder_info.depth + 1
      folder_info.parent_seq = parent_folder_info.seq
      folder_info.parent_folder_list = parent_folder_info.parent_folder_list
      folder_info.parent_folder_list.push(parent_folder_info.seq)
      folder_info.access_type = parent_folder_info.access_type ? parent_folder_info.access_type : '1';
    } else {
      folder_info.depth = 0
      folder_info.parent_folder_list = []
    }
    folder_info.group_seq = group_seq
    folder_info.member_seq = member_seq

    const is_valid_name = await model.isValidFolderName(group_seq, folder_info.folder_name, parent_folder_info ? parent_folder_info.seq : null)
    if (!is_valid_name) {
      throw new StdObject(-1, '이미 사용중인 폴더명입니다.', 400)
    }

    const folder_seq = await model.createOperationFolder(folder_info)
    folder_info.seq = folder_seq
    log.debug(this.log_prefix, '[createOperationFolder]', folder_seq, folder_info)

    return folder_info
  }

  renameOperationFolder = async (database, folder_seq, folder_name) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo({
      seq: folder_seq,
      folder_name,
    })
    return model.updateOperationFolder(folder_seq, folder_info);
  }

  updateOperationFolder = async (database, folder_seq, request_body) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const update_result = await model.updateOperationFolder(folder_seq, folder_info)
    return update_result
  }

  updateParentFolderAccessType = async (database, folder_seq, access_type) => {
    const model = this.getOperationFolderModel(database)
    const update_result = await model.updateOperationFolderAccessType(folder_seq, access_type)
    return update_result
  }

  moveFolder = async (database, request_body) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const target_folder_info = new OperationFolderInfo(request_body.target_folder_info)
    const result = await model.moveFolder(folder_info, target_folder_info)
    return result
  }

  deleteOperationFolder = async (database, group_seq, folder_seq) => {
    const model = this.getOperationFolderModel(database)
    const allChildFolders = await model.getAllChildFolders(group_seq, folder_seq, true)
    for (let cnt = 0; cnt < allChildFolders.length; cnt++) {
      const operation_result = await OperationService.getOperationByFolderSeq(DBMySQL, group_seq, allChildFolders[cnt].seq)
      if (operation_result.length === 0) {
        await model.deleteOperationFolder(group_seq, allChildFolders[cnt].seq)
      }
    }
  }

  deleteOperationFolders = async (database, group_seq, folder_seq_list) => {
    const model = this.getOperationFolderModel(database)
    for (let cnt = 0; cnt < folder_seq_list.length; cnt++) {
      await model.deleteOperationFolder(group_seq, folder_seq_list[cnt])
    }
  }

  isFolderFileCheck = async (database, group_seq, folder_seq) => {
    try {
      let file_chk = false
      const model = this.getOperationFolderModel(database)
      const allChildFolders = await model.getAllChildFolders(group_seq, folder_seq, true)
      log.debug(this.log_prefix, '[isFolderFileCheck]', allChildFolders)
      for (let cnt = 0; cnt < allChildFolders.length; cnt++) {
        const operation_result = await OperationService.getOperationByFolderSeq(DBMySQL, group_seq, allChildFolders[cnt].seq)
        if (operation_result.length > 0) {
          file_chk = true
        }
      }
      return file_chk
    } catch (e) {
      log.debug(this.log_prefix, '[isFolderFileCheck]', e)
      return false
    }
  }

  onChangeFolderSize = async (group_seq, folder_seq, is_reset = false) => {
    if (!folder_seq) return
    const folder_model = this.getOperationFolderModel(DBMySQL)
    const folder_info = await folder_model.getFolderInfoBySeq(folder_seq)
    if (!folder_info) return
    const child_folder_seq_list = []
    if (is_reset) {
      child_folder_seq_list.push(folder_seq)
    } else {
      const child_folder_list = await folder_model.getAllChildFolders(group_seq, folder_seq)
      for (let i = 0; i < child_folder_list.length; i++) {
        child_folder_seq_list.push(child_folder_list[i].seq)
      }
    }
    const storage_model = new OperationStorageModel(DBMySQL)
    const total_file_size = await storage_model.getFolderTotalSize(group_seq, child_folder_seq_list)
    await folder_model.setFolderStorageSize(folder_seq, total_file_size)

    const change_file_size = is_reset ? total_file_size : total_file_size - Util.parseInt(folder_info.total_folder_size)
    const parent_folder_list = folder_info.parent_folder_list ? JSON.parse(folder_info.parent_folder_list) : []
    if (parent_folder_list.length !== 0) {
      await folder_model.addFolderStorageSizeBySeqList(parent_folder_list, change_file_size)
    }
  }

  syncFolderTotalSize = async (group_seq) => {
    const folder_model = this.getOperationFolderModel()
    const filter = {}
    filter.group_seq = group_seq

    const max_depth = await folder_model.getGroupFolderMaxDepth(group_seq)
    for (let depth  = 0; depth  <= max_depth; depth ++) {
      const folder_list = await folder_model.getAllGroupFolderList(group_seq, depth)
      for (let cnt = 0; cnt < folder_list.length; cnt++) {
        const folder_info = new OperationFolderInfo(folder_list[cnt])
        log.debug(this.log_prefix, '[syncFolderTotalSize]', group_seq, folder_info.seq)
        await this.onChangeFolderSize(group_seq, folder_info.seq, true)
      }
    }
  }
  updateStatusFavorite = async (database, folder_seq, is_delete) => {
    const model = this.getOperationFolderModel(database)
    return await model.updateStatusFavorite(folder_seq, is_delete)
  }
  updateStatusTrash = async (database, seq_list, group_seq, is_delete) => {
    const model = this.getOperationFolderModel(database)
    const status = is_delete ? 'Y' : 'T'
    await model.updateStatusTrash(seq_list, group_seq, status)

    return true
  }

  getGroupFolderByDepthZero = async (database, group_seq) => {
    const model = this.getOperationFolderModel(database)
    return await model.getGroupFolderByDepthZero(group_seq)
  }
}

const operation_folder_service = new OperationFolderServiceClass()
export default operation_folder_service
