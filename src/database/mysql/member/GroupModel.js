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
    this.group_private_fields = ['member_seq', 'content_id', 'media_path', 'start_date', 'reg_date', 'modify_date']
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
      seq: group_seq
    }
    const query_result = await this.findOne(filter)
    return new GroupInfo(query_result, private_keys ? private_keys : this.group_private_fields)
  }

  getGroupInfoWithProduct = async  (group_seq, private_keys = null) => {
    const filter = {
      'group_info.seq': group_seq
    }
    this.group_with_product_select = [
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status',
      'group_info.group_name', 'group_info.expire_date AS group_expire_date',
      'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size',
      'payment_list.name AS plan_name', 'payment_list.desc AS plan_desc'
    ];
    const query = this.database.select(this.group_with_product_select)
    query.from(this.table_name)
    query.leftOuterJoin('payment_list', { "payment_list.code": "group_info.pay_code" })
    query.where(filter)
    query.first()
    const query_result = await query
    return new GroupInfo(query_result)
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
