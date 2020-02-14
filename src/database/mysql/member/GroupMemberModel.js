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
      'group_member.seq AS group_member_seq', 'group_member.used_storage_size', 'group_member.max_storage_size', 'group_member.grade',
      'group_member.status AS group_member_status', 'group_member.join_date', 'group_member.ban_date', 'group_member.ban_member_seq',
      'group_member.invite_email', 'group_member.invite_status', 'group_member.invite_date', 'group_member.invite_code',
      'member.user_name', 'member.user_nickname', 'member.email_address', 'member.hospname', 'member.treatcode', 'member.used'
    ];
    this.member_group_select = [
      'group_member.used_storage_size', 'group_member.max_storage_size', 'group_member.grade',
      'group_member.status AS group_member_status', 'group_member.join_date',
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status', 'group_info.group_name',
      'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size'
    ];

    this.group_invite_select = [
      'group_member.invite_code', 'group_member.member_seq AS join_member_seq', 'group_member.seq AS invite_seq', 'group_member.grade',
      'group_member.status AS group_member_status', 'group_member.join_date', 'group_member.invite_status',
      'group_info.seq AS group_seq', 'group_info.group_type', 'group_info.status AS group_status',
      'group_info.group_name', 'group_info.expire_date AS group_expire_date',
      'group_info.storage_size AS group_max_storage_size', 'group_info.used_storage_size AS group_used_storage_size',
      'payment_list.name AS plan_name', 'payment_list.desc AS plan_desc',
      'member.user_name AS invite_user_name', 'member.user_nickname AS invite_user_nickname'
    ];

    this.group_invite_private_fields = [
      'invite_code', 'invite_status', 'join_member_seq', 'grade', 'group_member_status', 'group_seq', 'group_type', 'group_status'
    ]
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
    if (Util.isNumber(params.invite_date)) {
      params.invite_date = this.database.raw(`FROM_UNIXTIME(${params.invite_date})`)
    }
    if (is_set_modify_date) {
      params.modify_date = this.database.raw('NOW()')
    }
    return params
  }

  createGroupMember = async (group_info, member_seq, grade, max_storage_size) => {
    const group_member_info = {
      group_seq: group_info.seq,
      member_seq,
      max_storage_size: max_storage_size ? max_storage_size : group_info.storage_size,
      used_storage_size: 0,
      grade: grade,
      status: 'Y',
      join_date: Util.getCurrentTimestamp()
    }
    const create_params = this.getParams(group_member_info)
    const group_member_seq = await this.create(create_params, 'seq')
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
    const query_result = await this.findOne(filter)
    return new GroupMemberInfo(query_result, private_keys)
  }

  getGroupMemberInfoBySeq = async (group_member_seq, private_keys = null) => {
    const filter = {
      seq: group_member_seq
    }
    const query_result = await this.findOne(filter)
    return new GroupMemberInfo(query_result, private_keys)
  }

  getGroupMemberQuery = (member_seq, group_seq = null, status = null) => {
    const filter = {
      'group_member.member_seq': member_seq
    }
    if (group_seq) {
      filter['group_member.group_seq'] = group_seq
    }
    if (status) {
      filter['group_member.status'] = status
    }
    const in_raw = this.database.raw("group_info.status IN ('Y', 'F')")
    const query = this.database.select(this.member_group_select);
    query.from('group_member')
    query.innerJoin("group_info", function() {
      this.on("group_info.seq", "group_member.group_seq")
        .andOn(in_raw)
    })
    query.where(filter)

    return query
  }

  getMemberGroupList = async (member_seq, status = null, private_keys = null) => {
    const query = this.getGroupMemberQuery(member_seq, null, status)
    const query_result = await query
    return this.getFindResultList(query_result, private_keys)
  }

  getMemberGroupInfoWithGroup = async (group_seq, member_seq, status = null, private_keys = null) => {
    const query = this.getGroupMemberQuery(member_seq, group_seq, status)
    query.first()
    const query_result = await query
    return new GroupMemberInfo(query_result, private_keys)
  }

  getGroupMemberList = async (group_seq, status = null, paging = {}, search_text = null, order = null) => {
    const filter = {
      group_seq
    }
    if (status) {
      filter['group_member.status'] = status
    }
    const query = this.database.select(this.group_member_select)
    query.from('group_member');
    query.leftOuterJoin("member", { "member.seq": "group_member.member_seq" });
    query.where(filter)
    if (search_text) {
      query.andWhere(function() {
        this
          .where("member.user_name", "like", `%${search_text}%`)
          .orWhere("group_member.invite_email", "like", `%${search_text}%`)
          .orWhere("member.email_address", "like", `%${search_text}%`)
          .orWhere("member.treatcode", "like", `%${search_text}%`)
      })
    }
    if (order) {
      query.orderBy(order)
    }

    const query_result = await this.queryPaginated(query, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging)
    query_result.data = this.getFindResultList(query_result.data, null)
    log.debug(this.log_prefix, '[getGroupMemberList]', query_result.data)
    return query_result
  }

  getFindResultList = (query_result, private_keys = null) => {
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

  updateStorageUsedSizeByGroupMemberSeq = async (group_member_seq, used_storage_size) => {
    const filter = {
      seq: group_member_seq
    }
    return await this.updateStorageUsedSize(filter, used_storage_size)
  }

  updateStorageUsedSizeByMemberSeq = async (group_seq, member_seq, used_storage_size) => {
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

  getGroupMemberInfoByInviteEmail = async (group_seq, email_address) => {
    const filter = {
      group_seq,
      invite_email: email_address
    }
    const find_result = await this.findOne(filter);
    return new GroupMemberInfo(find_result)
  }

  isAvailableInviteCode = async (invite_code) => {
    const select = ['COUNT(*) AS total_count']
    const filter = {
      invite_code
    }
    const find_result = await this.findOne(filter, select);
    if (!find_result) {
      return true
    }
    return Util.parseInt(find_result.total_count, 0) === 0
  }

  createGroupInvite = async (group_seq, invite_member_seq, invite_code, email_address) => {
    const create_params = {
      group_seq: group_seq,
      invite_code,
      invite_member_seq,
      invite_email: email_address,
      invite_status: 'S',
      invite_date: this.database.raw('NOW()')
    }
    const group_member_seq = await this.create(create_params, 'seq')
    create_params.seq = group_member_seq
   return new GroupMemberInfo(create_params, ['invite_date'])
  }

  resetInviteInfo = async (group_member_seq, invite_code) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      invite_code,
      invite_status: 'S',
      invite_date: this.database.raw('NOW()')
    }
    const query_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, query_result)
    return query_result
  }

  getGroupInviteInfo = async (invite_code, invite_seq = null, private_keys = null) => {
    const filter = {}
    if (invite_seq) {
      filter.seq = invite_seq
    } else {
      filter.invite_code = invite_code
    }

    const group_member_query = this.database.select([ '*' ])
    group_member_query.from(this.table_name)
    group_member_query.where(filter)
    group_member_query.first()

    const query = this.database.select(this.group_invite_select)
    query.from(group_member_query.clone().as('group_member'));
    query.innerJoin("group_info", { "group_info.seq": "group_member.group_seq" });
    query.innerJoin("payment_list", { "payment_list.code": "group_info.pay_code" });
    query.leftOuterJoin("member", { "member.seq": "group_member.invite_member_seq" });
    query.first()

    const query_result = await query
    return new GroupMemberInfo(query_result, private_keys ? private_keys : this.group_invite_private_fields)
  }

  updateInviteStatus = async (group_member_seq, invite_status, error = null) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      invite_status,
      modify_date: this.database.raw('NOW()')
    }
    if (error) {
      update_params.invite_error = error
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[updateInviteStatus]', update_result)
    return update_result
  }

  inviteConfirm = async (group_member_seq, member_seq, max_storage_size = 0) => {
    const filter = {
      seq: group_member_seq
    }
    const update_params = {
      member_seq,
      status: 'Y',
      invite_code: null,
      invite_status: 'Y',
      max_storage_size: max_storage_size,
      join_date: this.database.raw('NOW()'),
      modify_date: this.database.raw('NOW()')
    }
    const update_result = await this.update(filter, update_params)
    log.debug(this.log_prefix, '[inviteConfirm]', update_result)
    return update_result
  }
}
