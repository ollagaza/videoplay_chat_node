import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import GroupInfo from '../../../wrapper/member/GroupInfo'
import log from '../../../libs/logger'

export default class GroupModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_info'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupModel]'
  }

  getParams = (group_info, is_set_modify_date = true, ignore_empty = true) => {
    log.debug(this.log_prefix, '[getParams]', group_info instanceof GroupInfo)
    if (!(group_info instanceof GroupInfo)) {
      group_info = new GroupInfo(group_info)
    }
    group_info.setIgnoreEmpty(ignore_empty)
    const params = group_info.toJSON()
    if (Util.isNumber(params.start_date)) {
      params.start_date = this.database.raw(`FROM_UNIXTIME(${params.start_date})`)
    }
    if (Util.isNumber(params.expire_date)) {
      params.expire_date = this.database.raw(`FROM_UNIXTIME(${params.expire_date})`)
    }
    if (is_set_modify_date) {
      params.modify_date = this.database.raw('NOW()')
    }
    return params
  }

  createGroup = async (group_info) => {
    const create_params = this.getParams(group_info)
    const group_seq = await this.create(create_params, 'seq')
    group_info.seq = group_seq
    if (!(group_info instanceof GroupInfo)) {
      return new GroupInfo(group_info)
    }
    group_info.addKey('seq')
    return group_info
  }

  getGroupInfo = async  (group_seq, private_keys = null) => {
    const filter = {
      group_seq
    }
    const query_result = await this.findOne(filter)
    return new GroupInfo(query_result, private_keys)
  }

  changePlan = async (group_seq, pay_code, storage_size, start_date, expire_date) => {
    const group_info = {
      pay_code,
      storage_size,
      start_date,
      expire_date
    }
    const update_params = this.getParams(group_info)
    return await this.update({ seq: group_seq }, update_params)
  }

  updateStorageUsedSize = async (group_seq, used_storage_size) => {
    const filter = {
      seq: group_seq
    }
    const update_params = {
      used_storage_size,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }
}
