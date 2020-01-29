import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import GroupMemberInfo from '../../../wrapper/member/GroupMemberInfo'
import GroupInviteInfo from '../../../wrapper/member/GroupInviteInfo'

export default class GroupMemberModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_member'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupMemberModel]'
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

  getMemberGroupList = async (member_seq, state = null, private_keys = null) => {
    const filter = {
      member_seq
    }
    if (state) {
      filter.state = state
    }
    return this.getFindResultList(filter, private_keys)
  }

  getGroupMemberList = async (group_seq, state = null, private_keys = null) => {
    const filter = {
      group_seq
    }
    if (state) {
      filter.state = state
    }
    return this.getFindResultList(filter, private_keys)
  }

  getFindResultList = async (filter, private_keys) => {
    const result_list = []
    const query_result = this.find(filter)
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

  getGroupMemberCount = async (group_seq, state) => {
    const select = ['COUNT(*) AS total_count']
    const filter = {
      group_seq
    }
    if (state) {
      filter.state = state
    }
    const find_result = await this.findOne(filter, select);
    if (!find_result) {
      return 0
    }
    return Util.parseInt(find_result.total_count, 0)
  }
}
