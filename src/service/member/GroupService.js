import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberService from './MemberService'
import OperationService from '../operation/OperationService'
import GroupModel from '../../database/mysql/member/GroupModel';
import GroupMemberModel from '../../database/mysql/member/GroupMemberModel';
import SendMail from '../../libs/send-mail'

const GroupServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupServiceClass]'
  }

  getGroupModel = (database) => {
    if (database) {
      return new GroupModel(database)
    }
    return new GroupModel(DBMySQL)
  }

  getGroupMemberModel = (database) => {
    if (database) {
      return new GroupMemberModel(database)
    }
    return new GroupMemberModel(DBMySQL)
  }

  getBaseInfo = (req, group_seq_from_token = true) => {
    const token_info = req.token_info;
    const member_seq = token_info.getId()
    const group_seq = group_seq_from_token ? token_info.getGroupSeq() : req.params.group_seq

    return {
      token_info,
      member_seq,
      group_seq
    }
  }

  checkGroupAuth = async (database, req, group_seq_from_token = true, check_group_auth = true, throw_exception = false) => {
    const { token_info, member_seq, group_seq } = this.getBaseInfo(req, group_seq_from_token)
    const member_info = await MemberService.getMemberInfo(database, member_seq)
    if (!MemberService.isActiveMember(member_info)) {
      throw MemberService.getMemberStateError(member_info)
    }
    let group_member_info = null
    let is_active_group_member = true
    if ( token_info.getRole() === Role.ADMIN ) {
      is_active_group_member = true
    } else if (check_group_auth) {
      if (!group_seq) {
        is_active_group_member = false
      } else {
        group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
        is_active_group_member = !group_member_info || group_member_info.isEmpty() || !group_member_info.group_seq || !group_member_info.member_seq
      }
    }
    if ( !is_active_group_member && throw_exception) {
      throw new StdObject(-1, '권한이 없습니다', 403)
    }
    return {
      member_seq,
      group_seq,
      member_info,
      group_member_info,
      is_active_group_member
    }
  }

  createPersonalGroup = async (database, member_info, options = {}) => {
    const storage_size = Util.parseInt(options.storage_size, 0)
    const used_storage_size = Util.parseInt(options.used_storage_size, 0)
    const create_group_info = {
      member_seq: member_info.seq,
      group_type: 'P',
      status: 'F',
      group_name: member_info.user_name,
      storage_size: storage_size > 0 ? storage_size : Util.parseInt(ServiceConfig.get('default_storage_size')) * Constants.GB,
      used_storage_size
    }
    return await this.createGroupInfo(database, create_group_info, member_info.seq, options)
  }

  createEnterpriseGroup = async (database, group_type, member_info, options = {}) => {
    const create_group_info = {
      member_seq: member_info.seq,
      group_type,
      status: 'F',
      group_name: member_info.user_name,
      storage_size: 0,
      used_storage_size: 0
    }
    return await this.createGroupInfo(database, create_group_info, member_info.seq, options)
  }

  createGroupInfo = async (database, create_group_info, member_seq, options) => {
    const content_id = Util.getContentId()
    create_group_info.content_id = content_id
    create_group_info.media_path = `/group/${content_id}`
    log.debug(this.log_prefix, '[createGroupInfo]', create_group_info, member_seq)
    const group_model = this.getGroupModel(database)
    const group_info = await group_model.createGroup(create_group_info)
    const group_member_info = await this.addGroupMember(database, group_info, member_seq, 'O')

    if (!options.result_by_object) {
      return group_info
    }

    const result = {
      group_info
    }

    if (options.return_width_model) {
      result.group_model = group_model
    }
    if (options.return_width_member_info) {
      result.group_member_info = group_member_info
    }
    return result
  }

  addGroupMember = async (database, group_info, member_seq, grade, max_storage_size = 0) => {
    if (grade !== 'O' && group_info.group_type === 'P') {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const add_group_member_info = {
      group_seq: group_info.seq,
      member_seq,
      max_storage_size: max_storage_size ? max_storage_size : group_info.storage_size,
      used_storage_size: 0,
      grade: grade,
      status: 'Y',
      join_date: Util.getCurrentTimestamp()
    }
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_info = await group_member_model.createGroupMember(add_group_member_info)
    return group_member_info
  }

  getMemberGroupList = async (database, member_seq, is_active_only = true) => {
    log.debug(this.log_prefix, '[getMemberGroupList]', member_seq, is_active_only)
    const status = is_active_only ? 'Y' : null
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getMemberGroupList(member_seq, status)
  }

  getGroupMemberList = async (database, group_seq, request) => {
    const request_body = request.body ? request.body : {}
    const request_paging = request_body.paging ? request_body.paging : {}
    const request_order = request_body.request_order ? request_body.request_order : null
    const status = request_body.status
    const search_text = request_body.search_text

    const paging = {}
    paging.list_count = request_paging.list_count ? request_paging.list_count : 20
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = request_paging.no_paging ? request_paging.no_paging : 'Y'

    log.debug(this.log_prefix, '[getGroupMemberList]', request_body, status, search_text, paging)

    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberList(group_seq, status, paging, search_text, request_order)
  }

  getGroupMemberCount = async (database, group_seq, is_active_only = true) => {
    const status = is_active_only ? 'Y' : null
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberCount(group_seq, status)
  }

  getGroupMemberInfo = async (database, group_seq, member_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberInfo(group_seq, member_seq)
  }

  getGroupMemberInfoBySeq = async (database, group_member_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberInfoBySeq(group_member_seq)
  }

  isGroupAdmin = async (database, group_seq, member_seq) => {
    const group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
    return group_member_info.grade === 'A' || group_member_info.grade === 'B'
  }

  isActiveGroupMember = async (database, group_seq, member_seq) => {
    const group_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
    if (!group_info || group_info.isEmpty()) {
      return false
    }
    return group_info.status === 'Y'
  }

  getGroupInfo = async (database, group_seq) => {
    const group_model = this.getGroupModel(database)
    return await group_model.getGroupInfo(group_seq)
  }

  inviteGroupMembers = async (database, group_seq, member_seq, invite_email_list) => {
    if (!Util.isArray(invite_email_list)) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }
    const group_info = await this.getGroupInfo(database, group_seq)
    if (group_info.group_type === 'P') {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    if (group_info.member_seq !== member_seq) {
      const is_group_admin = await this.isGroupAdmin(database, group_seq, member_seq)
      if (!is_group_admin) {
        throw new StdObject(-1, '권한이 없습니다.', 400)
      }
    }

    const owner_info = await MemberService.getMemberInfo(database, group_info.member_seq)
    const group_info_json = group_info.toJSON()
    const active_user_count = await this.getGroupMemberCount(database, group_seq)
    group_info_json.active_user_count = active_user_count

    for (let i = 0; i < invite_email_list.length; i++) {
      (
        async (owner_info, group_info, email_address) => {
          await this.inviteGroupMember(null, owner_info, group_info, email_address)
        }
      )(owner_info, group_info_json, invite_email_list[i])
    }
  }

  getGroupMemberByEmail = async (database, group_seq, email_address) => {
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_info = await group_member_model.getGroupMemberByEmail(group_seq, email_address)
    return group_member_info
  }

  getAvailableInviteId = async (database) => {
    const group_member_model = this.getGroupMemberModel(database)
    let invite_code;
    let count = 0
    while (count < 5) {
      invite_code = Util.getRandomString(8).toUpperCase()
      if (await group_member_model.isAvailableInviteCode(invite_code)) {
        return invite_code
      }
      count++
    }
    throw new StdObject(-1, '초대 아이디를 생성할 수 없습니다.', 400)
  }

  inviteGroupMember = async (database, owner_info, group_info, email_address) => {
    let group_member_seq;
    const group_seq = group_info.seq
    let group_member_info = await this.getGroupMemberByEmail(database, group_seq, email_address)
    if (!group_member_info.isEmpty() && group_member_info.status !== 'N') {
      return
    }
    const invite_code = await this.getAvailableInviteId()

    const group_member_model = this.getGroupMemberModel(database)
    if (group_member_info.isEmpty()) {
      group_member_seq = group_member_info.seq
      await group_member_model.resetInviteInfo(group_member_seq, invite_code)
    } else {
      group_member_info = await group_member_model.createGroupInvite(group_seq, invite_code, email_address)
      group_member_seq = group_member_info.seq
    }


    const title = `<b>${owner_info.hospname}</b>의 ${owner_info.user_name}님이 Surgstory에 초대하였습니다.`
    const body = `<a href='${ServiceConfig.get('service_url')}/invite/group/${invite_code}' target="_blank">클릭</a>`
    const send_mail_result = await new SendMail().sendMailHtml([email_address], title, body);
    if (send_mail_result.isSuccess() === false) {
      await group_member_model.updateInviteStatus(group_member_seq, 'E', send_mail_result.message)
      return
    }
    await group_member_model.updateInviteStatus(group_member_seq, 'S')
  }

  joinGroup = async (database, member_seq, invite_code) => {
    const member_info = await MemberService.getMemberInfo(database)
    if (member_info.isEmpty() || member_info.seq !== member_seq) {
      throw new StdObject(-1, '등록되지 않은 회원입니다.', 400)
    }

    const group_member_model = this.getGroupMemberModel(database)
    const group_invite_info = await group_member_model.getGroupInviteByCode(invite_code)
    if (group_invite_info.isEmpty() || !group_invite_info.seq) {
      throw new StdObject(-2, '잘못된 링크입니다.', 400)
    }
    if (group_invite_info.invite_status !== 'S') {
      throw new StdObject(-3, '만료된 링크입니다.', 400)
    }
    const group_info = await this.getGroupInfo(database, group_invite_info.group_seq)
    if (group_info.isEmpty() || group_info.group_type === 'P') {
      throw new StdObject(-4, '그룹 정보가 없습니다.', 400)
    }
    if (group_info.status !== 'Y') {
      throw new StdObject(-5, '사용이 만료된 그룹입니다.', 400)
    }
    const group_member_info = await this.getGroupMemberInfo(database, group_invite_info.group_seq, member_seq)
    if (!group_member_info.isEmpty()) {
      throw new StdObject(-6, '이미 가입된 그룹입니다.', 400)
    }

    await this.addGroupMember(database, group_info, member_seq, 'N')
    await group_member_model.inviteConfirm(group_invite_info.seq, member_seq)

    return group_info
  }

  changeGradeAdmin = async (database, group_seq, member_seq, group_member_seq) => {
    const is_group_admin = await this.isGroupAdmin(database, group_seq, member_seq)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberGrade(group_member_seq, 'A')
  }

  changeGradeNormal = async (database, group_seq, member_seq, group_member_seq) => {
    const is_group_admin = await this.isGroupAdmin(database, group_seq, member_seq)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberGrade(group_member_seq, 'N')
  }

  updateGroupUsedStorage = async (database, group_seq) => {
    const operation_storage_used = await OperationService.getGroupTotalStorageUsedSize(database, group_seq)
    log.debug(this.log_prefix, '[updateGroupUsedStorage]', group_seq, operation_storage_used)
    const total_storage_used = operation_storage_used
    const group_model = this.getGroupModel(database)
    await group_model.updateStorageUsedSize(group_seq, total_storage_used)
  }

  updateMemberUsedStorage = async (database, group_seq, member_seq) => {
    const operation_storage_used = await OperationService.getGroupMemberStorageUsedSize(database, group_seq, member_seq)
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.updateStorageUsedSizeByMemberSeq(group_seq, member_seq, operation_storage_used)
    await this.updateGroupUsedStorage(database, group_seq)
  }

  updateMemberUsedStorageBySeq = async (database, group_member_seq) => {
    const group_member_info = await this.getGroupMemberInfo(group_member_seq)
    await this.updateMemberUsedStorage(database, group_member_info.group_seq, group_member_info.member_seq)
  }

  changeStorageUsed = async (database, group_seq, member_seq) => {
    await this.updateMemberUsedStorage(database, group_seq, member_seq)
    await this.updateGroupUsedStorage(database, group_seq)
  }

  deleteMember = async (database, group_seq, member_seq, group_member_seq, is_delete_operation = true) => {
    const is_group_admin = await this.isGroupAdmin(database, group_seq, member_seq)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    let used_storage_size = null
    if (is_delete_operation) {
      await OperationService.deleteGroupMemberOperations(group_seq, member_seq)
      used_storage_size = 0
    }
    await group_member_model.banMember(group_seq, group_member_seq, member_seq, used_storage_size)
    await this.updateGroupUsedStorage(database, group_seq)
  }

  unDeleteMember = async (database, group_seq, member_seq, group_member_seq) => {
    await this.restoreMemberState(database, group_seq, member_seq, group_member_seq)
  }

  pauseMember = async (database, group_seq, member_seq, group_member_seq) => {
    const is_group_admin = await this.isGroupAdmin(database, group_seq, member_seq)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberStatus(group_member_seq, 'P')
  }

  unPauseMember = async (database, group_seq, member_seq, group_member_seq) => {
    await this.restoreMemberState(database, group_seq, member_seq, group_member_seq)
  }

  restoreMemberState = async (database, group_seq, member_seq, group_member_seq) => {
    const is_group_admin = await this.isGroupAdmin(database, group_seq, member_seq)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.restoreMemberStatus(group_member_seq)
  }
}

const group_service = new GroupServiceClass()

export default group_service
