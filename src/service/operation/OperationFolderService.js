import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import util from "../../utils/baseutil";
import OperationService from '../operation/OperationService'
import OperationModel from "../../database/mysql/operation/OperationModel";
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
    if (request_query.menu !== 'favorite') {
      this.makeFolderTree(folder_map)
    }

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

  createOperationFolder = async (database, request_body, group_seq, member_seq) => {
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

  updateOperationFolder = async (database, folder_seq, request_body) => {
    const model = this.getOperationFolderModel(database)
    const folder_info = new OperationFolderInfo(request_body.folder_info)
    const update_result = await model.updateOperationFolder(folder_seq, folder_info)
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

  deleteOperationFolders = async (database, group_seq, folder_seqs) => {
    const model = this.getOperationFolderModel(database)
    for (let cnt = 0; cnt < folder_seqs.length; cnt++) {
      await model.deleteOperationFolder(group_seq, folder_seqs[cnt].seq)
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
  updateStatusFavorite = async (database, folder_seq, is_delete) => {
    const model = this.getOperationFolderModel(database)
    return await model.updateStatusFavorite(folder_seq, is_delete)
  }
  OperationFolderStorageSize = async (database, operation_info, old_storage_size, new_storage_size) => {
    if (operation_info.folder_seq !== null) {
      const model = this.getOperationFolderModel(database)
      const folder_info = await this.getFolderInfo(database, operation_info.group_seq, operation_info.folder_seq)
      let folder_seqs = null

      if (folder_info.parent_folder_list !== null && folder_info.parent_folder_list.length !== 0) {
        folder_seqs = _.concat([operation_info.folder_seq], folder_info.parent_folder_list)
      } else {
        folder_seqs = [operation_info.folder_seq]
      }
      let file_size = 0;

      if (new_storage_size > old_storage_size) {
        file_size = new_storage_size - (util.isEmpty(old_storage_size) ? 0 : old_storage_size)
      } else {
        file_size = (((util.isEmpty(old_storage_size) ? 0 : old_storage_size) - new_storage_size) * -1)
      }

      folder_seqs.unshift('in')

      const filters = {
        is_new: true,
        query: [
          {seq: folder_seqs}
        ],
      }

      return await model.updateFolderStorageSize(filters, file_size)
    } else {
      return true
    }
  }

  SyncFolderTotalSize = async (database) => {
    const output = new StdObject();
    const model = this.getOperationFolderModel(database)
    const operation_model = new OperationModel(database)
    const folder_list = await model.getAllFolderList();
    output.add('folder_list', folder_list)

    for (let cnt = 0; cnt < folder_list.length; cnt++) {
      const folder_info = new OperationFolderInfo(folder_list[cnt])
      const total_size_filter = { group_seq: folder_info.group_seq, folder_seq: folder_info.seq }
      const total_folder_file_size = await operation_model.getGroupUsedStorageSize(total_size_filter)

      const folder_seqs = folder_info.parent_folder_list
      folder_seqs.push(folder_info.seq)
      folder_seqs.unshift('in')
      const update_folder_size_filter = {
        is_new: true,
        query: [
          { seq: folder_seqs }
        ],
      }
      await model.updateFolderStorageSize(update_folder_size_filter, total_folder_file_size)
    }

    return output
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

  deleteChildFolderAndRtnOperationList = async (database, group_seq, operation_folder_list) => {
    const folder_seq = []
    let allChildFolderList = null

    for (let i = 0; i < operation_folder_list.length; i++) {
      allChildFolderList = await this.getChildAllFolderList(database, group_seq, operation_folder_list[i].seq)
      for (let cnt = 0; cnt < allChildFolderList.length; cnt++) {
        folder_seq.push(allChildFolderList[cnt].seq);
      }
    }
    const operation_data = await OperationService.getAllChildFolderInOperationDatas(database, group_seq, folder_seq)

    return { allChildFolderList, operation_data }
  }
}

const operation_folder_service = new OperationFolderServiceClass()
export default operation_folder_service
