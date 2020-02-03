import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import GroupMemberInfo from '../../../wrapper/member/GroupMemberInfo'
import log from '../../../libs/logger'

export default class GroupMemberModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_member'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupMemberModel]'
    this.group_member_select = [
      'group_member.seq', 'group_member.used_storage_size', 'group_member.max_storage_size', 'group_member.grade', 'group_member.status',
      'group_member.join_date', 'group_member.ban_date', 'group_member.ban_member_seq', 'member.hospname', 'member.treatcode', 'member.used'
    ];
  }

  getParams = (group_member_info, is_set_modify_date = true, ignore_empty = true) => {
    if (!(group_member_info instanceof GroupMemberInfo)) {
      group_member_info = new GroupMemberInfo(group_member_info)
    }
    group_member_info.setIgnoreEmpty(ignore_empty)
    const params = group_member_info.toJSON()
    if (Util.isNumber(params.ban_date)) {
      params.ban_date = this.database.raw(`FROM_UNIXTIME(${params.ban_date})`)
    }
    if (Util.isNumber(params.join_date)) {
      params.join_date = this.database.raw(`FROM_UNIXTIME(${params.join_date})`)
    }
    if (is_set_modify_date) {
      params.modify_date = this.database.raw('NOW()')
    }
  }

  createGroupMember = async (group_member_info) => {
    const create_params = this.getParams(group_member_info)
    const group_member_seq = this.create(create_params, 'seq')
    group_member_info.seq = group_member_seq
    if (!(group_member_info instanceof GroupMemberInfo)) {
      return new GroupMemberInfo(group_member_info)
    }
    group_member_info.addKey('seq')
    return group_member_info
  }

  getGroupMemberInfo = async (group_seq, member_seq, private_keys = null) => {
    const filter = {
      group_seq,
      member_seq
    }
    const query_result = this.findOne(filter)
    return new GroupMemberInfo(query_result, private_keys)
  }

  getGroupMemberInfoBySeq = async (group_member_seq, private_keys = null) => {
    const filter = {
      seq: group_member_seq
    }
    const query_result = this.findOne(filter)
    return new GroupMemberInfo(query_result, private_keys)
  }

  getMemberGroupList = async (member_seq, status = null, private_keys = null) => {
    const filter = {
      member_seq
    }
    if (status) {
      filter.status = status
    }
    const query_result = await this.find(filter)
    return this.getFindResultList(query_result, private_keys)
  }

  getGroupMemberList = async (group_seq, status = null) => {
    const filter = {
      group_seq
    }
    if (status) {
      filter.status = status
    }
    const query = this.database.select(this.group_member_select);
    query.from('group_member');
    query.innerJoin("member", { "member.seq": "group_member.member_seq", "member.used": "1" });
    query.where(filter);

    const query_result = await query

    return this.getFindResultList(query_result, null)
  }

  getFindResultList = async (query_result, private_keys = null) => {
    const result_list = []
    if (!query_result) {
      return result_list
    }
    if (Util.isArray(query_result)) {
      for (let i = 0; i < query_result.length; i++) {
        result_list.push(new GroupMemberInfo(query_result[i], private_keys))
      }
    } else {
      result_list.push(new GroupMemberInfo(query_result, private_keys))
    }
    return result_list
  }

  getGroupMemberCount = async (group_seq, status) => {
    const select = ['COUNT(*) AS total_count']
    const filter = {
      group_seq
    }
    if (status) {
      filter.status = status
    }
    const find_result = await this.findOne(filter, select);
    if (!find_result) {
      return 0
    }
    return Util.parseInt(find_result.total_count, 0)
  }

  changeMemberGrade = async (group_member_seq, grade) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      grade,
      modify_date: this.database.raw('NOW()')
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[changeMemberGrade]', update_result)
    return update_result
  }

  changeMemberStatus = async (group_member_seq, status) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      status,
      modify_date: this.database.raw('NOW()')
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[changeMemberStatus]', update_result)
    return update_result
  }

  banMember = async (group_member_seq, ban_member_seq, used_storage_size = null) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      status: 'D',
      modify_date: this.database.raw('NOW()'),
      ban_date: this.database.raw('NOW()'),
      ban_member_seq: ban_member_seq
    }
    if (used_storage_size) {
      update_params.used_storage_size = used_storage_size
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[banMember]', update_result)
    return update_result
  }

  restoreMemberStatus = async (group_member_seq) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      status: 'Y',
      modify_date: this.database.raw('NOW()'),
      ban_date: null,
      ban_member_seq: null
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[restoreMemberStatus]', update_result)
    return update_result
  }

  updateStorageUsedSizeByMemberSeq = async (group_member_seq, used_storage_size) => {
    const filter = {
      seq: group_member_seq
    }
    return await this.updateStorageUsedSize(filter, used_storage_size)
  }

  updateStorageUsedSizeByGroupMemberSeq = async (group_seq, member_seq, used_storage_size) => {
    const filter = {
      group_seq,
      member_seq
    }
    return await this.updateStorageUsedSize(filter, used_storage_size)
  }

  updateStorageUsedSize = async (filter, used_storage_size) => {
    const update_params = {
      used_storage_size,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update(filter, update_params)
  }
}
