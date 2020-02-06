import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import GroupInviteInfo from '../../../wrapper/member/GroupInviteInfo'
import log from '../../../libs/logger'

export default class GroupInviteModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_invite'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupInviteModel]'
    this.group_member_select = [
      'group_invite.seq AS group_invite_seq', 'group_invite.status AS group_invite_status', 'group_invite.email AS group_invite_email',
      'group_invite.confirm_date AS invite_confirm_date', 'group_invite.error_message',
      'group_member.seq AS group_member_seq', 'group_member.used_storage_size', 'group_member.max_storage_size', 'group_member.grade', 'group_member.status AS group_member_status',
      'group_member.join_date', 'group_member.ban_date', 'group_member.ban_member_seq',
      'member.user_name', 'member.user_nickname', 'member.email_address', 'member.hospname', 'member.treatcode', 'member.used'
    ];
  }

  getParams = (group_invite_info, is_set_modify_date = true, ignore_empty = true) => {
    if (!(group_invite_info instanceof GroupInviteInfo)) {
      group_invite_info = new GroupInviteInfo(group_invite_info)
    }
    group_invite_info.setIgnoreEmpty(ignore_empty)
    const params = group_invite_info.toJSON()
    if (Util.isNumber(params.confirm_date)) {
      params.confirm_date = this.database.raw(`FROM_UNIXTIME(${params.confirm_date})`)
    }
    if (is_set_modify_date) {
      params.modify_date = this.database.raw('NOW()')
    }
    return params
  }

  createGroupInvite = async (group_invite_info) => {
    const create_params = this.getParams(group_invite_info)
    const invite_seq = await this.create(create_params, 'seq')
    group_invite_info.seq = invite_seq
    if (!(group_invite_info instanceof GroupInviteInfo)) {
      return new GroupInviteInfo(group_invite_info)
    }
    group_invite_info.addKey('seq')
    return group_invite_info
  }

  getGroupInviteInfo = async (group_invite_seq, private_keys = null) => {
    const filter = {
      seq: group_invite_seq
    }
    const query_result = await this.findOne(filter)
    return new GroupInviteInfo(query_result, private_keys)
  }

  getGroupInviteByCode = async (invite_id, invite_code, private_keys = null) => {
    const filter = {}
    if (invite_id) {
      filter.invite_id = invite_id
    }
    if (invite_code) {
      filter.invite_code = invite_code
    }
    const query_result = await this.findOne(filter)
    return new GroupInviteInfo(query_result, private_keys)
  }

  updateInviteStatus = async (group_invite_seq, status, error = null) => {
    const filter = {
      seq: group_invite_seq
    }
    const update_params = {
      status,
      modify_date: this.database.raw('NOW()')
    }
    if (error) {
      update_params.error = error
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[updateInviteStatus]', update_result)
    return update_result
  }

  inviteConfirm = async (group_invite_seq, member_seq) => {
    const filter = {
      seq: group_invite_seq
    }
    const update_params = {
      member_seq,
      confirm_date: this.database.raw('NOW()'),
      modify_date: this.database.raw('NOW()')
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[inviteConfirm]', update_result)
    return update_result
  }

  isAvailableInviteId = async (invite_id) => {
    const select = ['COUNT(*) AS total_count']
    const filter = {
      invite_id
    }
    const find_result = await this.findOne(filter, select);
    if (!find_result) {
      return true
    }
    return Util.parseInt(find_result.total_count, 0) === 0
  }

  expireInviteInfo = async (group_seq, email_address) => {
    const filter = {
      group_seq,
      email: email_address
    }
    const update_params = {
      invite_id: null,
      invite_code: null,
      status: 'D',
      modify_date: this.database.raw('NOW()')
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[expireInviteInfo]', update_result)
    return update_result
  }

  getGroupMemberList = async (group_seq) => {
    const filter = {
      group_seq
    }
    const query = this.database.select(this.group_member_select);
    query.from('group_invite')
    query.leftOuterJoin('group_member', { "group_member.group_seq": "group_invite.group_seq", "group_member.member_seq": "group_invite.member_seq" })
    query.leftOuterJoin("member", { "member.seq": "group_invite.member_seq" })
    query.where(filter)
    query.whereNot({ status: 'D'} )

    const query_result = await query

    return this.getFindResultList(query_result, null)
  }
}
