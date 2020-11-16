import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'

export default class OperationFolderModel extends MySQLModel {
  constructor (...args) {
    super(...args)

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

  isValidFolderName = async (group_seq, folder_name, parent_seq = null, folder_seq = null) => {
    const filter = {
      group_seq,
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

  deleteOperationFolder = async (group_seq, folder_seq) => {
    return await this.delete({ group_seq, seq: folder_seq })
  }

  getFolderInfo = async (group_seq, folder_seq) => {
    return await this.findOne({ group_seq, seq: folder_seq })
  }

  getParentFolders = async (group_seq, parent_folder_list) => {
    const query = this.database.select(this.selectable_fields)
      .from(this.table_name)
      .where('group_seq', group_seq)
      .whereIn('seq', parent_folder_list)
      .orderBy('depth', 'asc')
    const result = await query
    return result
  }

  getGroupFolders = async (group_seq) => {
    const query = this.database.select(this.selectable_fields)
      .from(this.table_name)
      .where('group_seq', group_seq)
    query.orderBy([{ column: 'depth', order: 'asc' }, { column: 'folder_name', order: 'asc' }])
    const result = await query
    return result
  }

  getGroupFolderLastUpdate = async (group_seq) => {
    return await this.findOne({ group_seq: group_seq, status: 'Y' }, ['modify_date'], {
      name: 'modify_date',
      direction: 'desc'
    })
  }

  getChildFolders = async (group_seq, folder_seq) => {
    return await this.find({ group_seq, parent_seq: folder_seq, status: 'Y' }, null, {
      name: 'folder_name',
      direction: 'asc'
    })
  }

  getAllChildFolders = async (group_seq, folder_seq, include_current_folder = true) => {
    const query = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where('group_seq', group_seq)
    if (include_current_folder) {
      query.andWhere(function () {
        this.where('seq', folder_seq)
        this.orWhereRaw(`JSON_CONTAINS(parent_folder_list, '${folder_seq}', '$')`)
      })
    } else {
      query.orWhereRaw(`JSON_CONTAINS(parent_folder_list, '${folder_seq}', '$')`)
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

  moveFolder = async (folder_info, target_folder_info) => {
    if (target_folder_info && target_folder_info.parent_seq && target_folder_info.total_folder_size > 0) {
      const parent_folder_size_down = this.database
        .update('total_folder_size', this.database.raw(`total_folder_size - ${target_folder_info.total_folder_size}`))
        .from(this.table_name)
        .where('seq', target_folder_info.parent_seq)
      await parent_folder_size_down
    }
    if (target_folder_info.total_folder_size > 0) {
      const new_parent_folder_size_up = this.database
        .update('total_folder_size', this.database.raw(`total_folder_size + ${target_folder_info.total_folder_size}`))
        .from(this.table_name)
        .where('seq', folder_info.seq)
      await new_parent_folder_size_up
    }

    const target_folder_parent_seq_update = this.database
      .update('parent_seq', folder_info.seq)
      .from(this.table_name)
      .where('seq', target_folder_info.seq)
    await target_folder_parent_seq_update

    const target_folder_parent_list_update = this.database
      .update('target.parent_folder_list', this.database.raw(`JSON_MERGE(parent.parent_folder_list, '[${folder_info.seq}]')`))
      .from({ 'target': this.table_name })
      .leftOuterJoin({ 'parent': this.table_name }, 'parent.seq', folder_info.seq)
      .where(this.database.raw(`JSON_CONTAINS(target.parent_folder_list, '${target_folder_info.seq}')`) , '1')
      .orWhere('target.seq', target_folder_info.seq)
    await target_folder_parent_list_update
    return true
  }
  updateStatusFavorite = async (folder_seq, is_delete) => {
    return await this.update({ 'seq': folder_seq }, {
      is_favorite: is_delete ? 0 : 1,
      'modify_date': this.database.raw('NOW()')
    })
  }
  updateFolderStorageSize = async (filters, file_size) => {
    return await this.update(filters, {
      total_folder_size: this.database.raw(`if(cast(total_folder_size as SIGNED) + ${file_size} > 0, total_folder_size + ${file_size}, 0)`),
      'modify_date': this.database.raw('NOW()')
    })
  }

  getAllFolderList = async () => {
    return this.find(null, null, { name: 'depth', direction: 'desc' })
  }
  updateStatusTrash = async (operation_seq_list, group_seq, status) => {
    let filters = null
    if (group_seq) {
      filters = { group_seq }
    }
    return await this.updateIn('seq', operation_seq_list, {
      status,
      'modify_date': this.database.raw('NOW()')
    }, filters)
  }
}
