import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import log from "../../../libs/logger"

export default class OperationFolderModel extends MySQLModel {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_folder'
    this.log_prefix = '[OperationFolderModel]'
    this.selectable_fields = ['*']
  }

  createOperationFolder = async (folder_info) => {
    folder_info.setIgnoreEmpty(true)
    const create_params = folder_info.toJSON()
    if (typeof create_params.parent_folder_list === 'object') {
      create_params.parent_folder_list = JSON.stringify(create_params.parent_folder_list)
    }
    if (typeof create_params.access_users === 'object') {
      create_params.access_users = JSON.stringify(create_params.access_users)
    }
    create_params.reg_date = this.database.raw('NOW()')
    create_params.modify_date = this.database.raw('NOW()')

    return await this.create(create_params, 'seq')
  }

  isValidFolderName = async (folder_name, parent_seq = null, folder_seq = null) => {
    const filter = {
      folder_name,
      parent_seq
    }
    const find_result = await this.find(filter)
    if (!find_result || find_result.length <= 0) {
      return true
    }
    if (!folder_seq) {
      return false
    }
    if (find_result.length === 1) {
      if (find_result[0].seq === folder_seq) {
        return true
      }
    }
    return false
  }

  deleteOperationFolder = async (folder_seq) => {
    return await this.delete({ seq: folder_seq })
  }

  getFolderInfo = async (group_seq, folder_seq) => {
    return await this.findOne({ group_seq, seq: folder_seq })
  }

  getParentFolders = async (group_seq, parent_folder_list) => {
    const query = this.database.select(this.selectable_fields)
      .from(this.table_name)
      .where('group_seq', group_seq)
      .whereIn('seq', parent_folder_list)
      .orderBy("depth", "asc")
    const result = await query
    return result
  }

  getGroupFolders = async (group_seq) => {
    return await this.find({ group_seq: group_seq, status: 'Y' }, null, [{ column: "depth", order: "asc" }, { column: 'folder_name', order: 'asc' }])
  }

  getGroupFolderLastUpdate = async (group_seq) => {
    return await this.findOne({ group_seq: group_seq, status: 'Y' }, ['modify_date'], { name: "modify_date", direction: "desc" })
  }

  getChildFolders = async (group_seq, folder_seq) => {
    return await this.find({ group_seq, parent_seq: folder_seq, status: 'Y' }, null, { name: "folder_name", direction: "asc" })
  }

  getAllChildFolders = async (group_seq, folder_seq, include_current_folder = true) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where('group_seq', group_seq.group_seq);
    if (include_current_folder) {
      query.andWhere(function () {
        this.where('seq', folder_seq)
          .orWhere(this.raw(`JSON_CONTAINS(parent_folder_info, '${folder_seq}', '$')`))
      })
    } else {
      query.andWhere(this.database.raw(`JSON_CONTAINS(parent_folder_info, '${folder_seq}', '$')`));
    }
    return query
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

  moveFolder = async (folder_info, new_parent_info = null, move_child_only = false) => {
    let is_replace = false
    let replace_query_str = ""
    if (folder_info.parent_folder_info && folder_info.parent_folder_info.length > 0) {
      replace_query_str = "JSON_REMOVE(parent_folder_info"
      for (let i = 0; i < folder_info.parent_folder_info.length; i++) {
        replace_query_str += ", '$[0]'"
      }
      if (move_child_only) {
        replace_query_str += ", '$[0]'"
      }
      replace_query_str += ")"
      is_replace = true
    } else {
      replace_query_str = "parent_folder_info"
    }
    if (new_parent_info && new_parent_info.parent_folder_info && new_parent_info.parent_folder_info.length > 0) {
      replace_query_str = `JSON_MERGE(${JSON.stringify(new_parent_info.parent_folder_info)}, ${replace_query_str})`
      is_replace = true
    }

    if (!is_replace) {
      return
    }

    const parent_depth = new_parent_info ? new_parent_info.depth : 0
    let change_depth = folder_info.depth - parent_depth
    if (!move_child_only) {
      change_depth--
    }

    const update_params = {
      parent_folder_info: this.database.raw(replace_query_str),
      depth: this.database.raw(`depth - (${change_depth})`)
    }
    if (move_child_only) {
      update_params.parent_seq = new_parent_info.seq
    }

    const update_query = this.database
      .update(update_params)
      .from(this.table_name)
      .where('group_seq', folder_info.group_seq)
    if (move_child_only) {
      update_query.andWhere('depth', '>', folder_info.depth)
        .andWhere(this.raw(`JSON_CONTAINS(parent_folder_info, '${folder_info.seq}', '$')`))
    } else {
      update_query.andWhere('depth', '>=', folder_info.depth)
        .andWhere(function () {
          this.where('seq', folder_info.seq)
            .orWhere(this.raw(`JSON_CONTAINS(parent_folder_info, '${folder_info.seq}', '$')`))
        })
    }

    const update_result = await update_query
    log.debug(this.log_prefix, '[changeParentFolderList] - update_result', update_result)

    if (move_child_only) {
      const delete_result = await this.deleteOperationFolder(folder_info.seq)
      log.debug(this.log_prefix, '[changeParentFolderList] - delete_result', delete_result)
    }
    return update_result
  }
}
