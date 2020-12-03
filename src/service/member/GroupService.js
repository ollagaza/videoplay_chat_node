import _ from 'lodash'
import ServiceConfig from '../../service/service-config'
import Util from '../../utils/baseutil'
import Role from '../../constants/roles'
import Constants from '../../constants/constants'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import MemberService from './MemberService'
import OperationService from '../operation/OperationService'
import OperationDataService from '../operation/OperationDataService'
import SocketManager from '../socket-manager'
import GroupModel from '../../database/mysql/member/GroupModel'
import GroupMemberModel from '../../database/mysql/member/GroupMemberModel'
import SendMail from '../../libs/send-mail'
import GroupMailTemplate from '../../template/mail/group.template'
import VacsService from '../vacs/VacsService'
import Auth from '../../middlewares/auth.middleware'
import GroupCountModel from '../../database/mysql/member/GroupCountsModel'
import ContentCountsModel from '../../database/mysql/member/ContentCountsModel'

const GroupServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupServiceClass]'
    this.GROUP_TYPE_PERSONAL = 'P'
    this.GROUP_TYPE_ENTERPRISE = 'G'
    this.GROUP_STATUS_FREE = 'F'
    this.GROUP_STATUS_ENABLE = 'Y'
    this.GROUP_STATUS_PLAN_EXPIRE = 'E'
    this.GROUP_STATUS_DISABLE = 'N'
    this.MEMBER_STATUS_ENABLE = 'Y'
    this.MEMBER_STATUS_DISABLE = 'D'
    this.MEMBER_STATUS_PAUSE = 'P'
    this.MEMBER_STATUS_DELETE = 'D'
    this.MEMBER_GRADE_OWNER = 'O'
    this.MEMBER_GRADE_ADMIN = 'A'
    this.MEMBER_GRADE_NORMAL = 'N'
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

  getGroupCountsModel = (database) => {
    if (database) {
      return new GroupCountModel(database)
    }
    return new GroupCountModel(DBMySQL)
  }

  getContentCountsModel = (database) => {
    if (database) {
      return new ContentCountsModel(database)
    }
    return new ContentCountsModel(DBMySQL)
  }

  getBaseInfo = (req, group_seq_from_token = true) => {
    const token_info = req.token_info
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
    let is_active_group_member = false
    let is_group_admin = false
    if (token_info.getRole() === Role.ADMIN) {
      is_active_group_member = true
      is_group_admin = true
      group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
    } else if (check_group_auth) {
      if (!group_seq) {
        is_active_group_member = false
      } else {
        group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
        is_active_group_member = group_member_info && group_member_info.group_member_status === this.MEMBER_STATUS_ENABLE
        is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
      }
    }
    if (!is_active_group_member && throw_exception) {
      throw new StdObject(-1, '권한이 없습니다', 403)
    }
    return {
      token_info,
      member_seq,
      group_seq,
      member_info,
      group_member_info,
      is_active_group_member,
      is_group_admin
    }
  }

  createPersonalGroup = async (database, member_info, options = {}) => {
    const storage_size = Util.parseInt(options.storage_size, 0)
    const pay_code = options.pay_code ? options.pay_code : 'free'
    const start_date = options.start_date ? options.start_date : null
    const expire_date = options.expire_date ? options.expire_date : null
    const status = pay_code !== 'free' ? this.GROUP_STATUS_ENABLE : this.GROUP_STATUS_FREE
    const used_storage_size = Util.parseInt(options.used_storage_size, 0)
    const create_group_info = {
      member_seq: member_info.seq,
      group_type: this.GROUP_TYPE_PERSONAL,
      status,
      group_name: member_info.user_name,
      storage_size: storage_size > 0 ? storage_size : Util.parseInt(ServiceConfig.get('default_storage_size')) * Constants.GB,
      used_storage_size,
      pay_code,
      start_date,
      expire_date
    }
    return await this.createGroupInfo(database, create_group_info, member_info, 'personal')
  }

  createEnterpriseGroup = async (database, member_info, options = {}) => {
    const storage_size = Util.parseInt(options.storage_size, 0)
    const pay_code = options.pay_code ? options.pay_code : 'free'
    const start_date = options.start_date ? options.start_date : null
    const expire_date = options.expire_date ? options.expire_date : null
    const status = pay_code !== 'free' ? this.GROUP_STATUS_ENABLE : this.GROUP_STATUS_FREE
    const create_group_info = {
      member_seq: member_info.seq,
      group_type: this.GROUP_TYPE_ENTERPRISE,
      status,
      group_name: options.group_name?options.group_name:member_info.user_name,
      storage_size: storage_size > 0 ? storage_size : Util.parseInt(ServiceConfig.get('default_storage_size')) * Constants.GB,
      used_storage_size: 0,
      pay_code,
      start_date,
      expire_date
    }
    return await this.createGroupInfo(database, create_group_info, member_info, 'enterprise')
  }

  createGroupInfo = async (database, create_group_info, member_info, root_directory_name) => {
    const member_seq = member_info.seq
    const content_id = Util.getContentId()
    create_group_info.content_id = content_id
    create_group_info.media_path = `/${root_directory_name}/${content_id}`
    create_group_info.profile = JSON.stringify({ 'desc': '', 'image': '', 'title': '' })
    log.debug(this.log_prefix, '[createGroupInfo]', create_group_info, member_seq)
    const group_model = this.getGroupModel(database)
    const group_info = await group_model.createGroup(create_group_info)
    const group_counts_model = this.getGroupCountsModel(database)
    await group_counts_model.createCounts(group_info.seq)
    const content_counts_model = this.getContentCountsModel(database)
    await content_counts_model.createContentCount('all', group_info.seq)
    await this.addGroupMember(database, group_info, member_info, this.MEMBER_GRADE_OWNER)

    return group_info
  }

  addGroupMember = async (database, group_info, member_info, grade, max_storage_size = 0) => {
    if (grade !== this.MEMBER_GRADE_OWNER && group_info.group_type === this.GROUP_TYPE_PERSONAL) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }

    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.createGroupMember(group_info, member_info, grade, max_storage_size)
  }

  getMemberGroupList = async (database, member_seq, is_active_only = true) => {
    log.debug(this.log_prefix, '[getMemberGroupList]', member_seq, is_active_only)
    const status = is_active_only ? this.MEMBER_STATUS_ENABLE : null
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_list = await group_member_model.getMemberGroupList(member_seq, status)
    for (let i = 0; i < group_member_list.length; i++) {
      const group_member_info = group_member_list[i]
      if (group_member_info.profile_image_path) {
        group_member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_member_info.profile_image_path)
      }
    }
    if (ServiceConfig.isVacs()) {
      const vacs_storage_info = await VacsService.getCurrentStorageStatus()
      log.debug(this.log_prefix, '[getMemberGroupList]', '[vacs_storage_info]', vacs_storage_info)
      for (let i = 0; i < group_member_list.length; i++) {
        const group_member_info = group_member_list[i]
        group_member_info.group_used_storage_size = vacs_storage_info.used_size
        group_member_info.group_max_storage_size = vacs_storage_info.total_size
      }
    }
    return group_member_list
  }

  getGroupMemberList = async (database, group_seq, request) => {
    const request_body = request.body ? request.body : {}
    const request_paging = request_body.paging ? request_body.paging : {}
    const request_order = request_body.order ? request_body.order : null
    const search_text = request_body.search_text ? request_body.search_text : null
    const member_type = request_body.member_type ? request_body.member_type : null

    const paging = {}
    paging.list_count = request_paging.list_count ? request_paging.list_count : 20
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = request_paging.no_paging ? request_paging.no_paging : 'Y'

    log.debug(this.log_prefix, '[getGroupMemberList]', request_body, member_type, search_text, paging)

    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberList(group_seq, member_type, paging, search_text, request_order)
  }

  getGroupMemberCount = async (database, group_seq, is_active_only = true) => {
    const status = is_active_only ? this.MEMBER_STATUS_ENABLE : null
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberCount(group_seq, status)
  }

  getGroupMemberInfo = async (database, group_seq, member_seq, status = null) => {
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_info = await group_member_model.getMemberGroupInfoWithGroup(group_seq, member_seq, status)
    if (group_member_info.profile_image_path) {
      if (group_member_info.profile_image_url !== null) {
        group_member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_member_info.profile_image_path)
      }
    }
    if (!group_member_info.isEmpty() && ServiceConfig.isVacs()) {
      const vacs_storage_info = await VacsService.getCurrentStorageStatus()
      group_member_info.group_used_storage_size = vacs_storage_info.used_size
      group_member_info.group_max_storage_size = vacs_storage_info.total_size
    }
    return group_member_info
  }

  getGroupMemberInfoBySeq = async (database, group_member_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberInfoBySeq(group_member_seq)
  }

  getGroupMemberInfoByInviteEmail = async (database, group_seq, email_address) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberInfoByInviteEmail(group_seq, email_address)
  }

  isGroupAdmin = async (database, group_seq, member_seq) => {
    const group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
    return this.isGroupAdminByMemberInfo(group_member_info)
  }

  isGroupAdminByMemberInfo = (group_member_info) => {
    return group_member_info.grade === this.MEMBER_GRADE_ADMIN || group_member_info.grade === this.MEMBER_GRADE_OWNER
  }

  isActiveGroupMember = async (database, group_seq, member_seq) => {
    const group_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
    if (!group_info || group_info.isEmpty()) {
      return false
    }
    return group_info.group_member_status === this.MEMBER_STATUS_ENABLE
  }

  getGroupInfo = async (database, group_seq, private_keys = null) => {
    const group_model = this.getGroupModel(database)
    const group_info = await group_model.getGroupInfo(group_seq, private_keys)
    group_info.json_keys.push('profile_image_url')
    group_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_info.profile_image_path)
    return group_info
  }

  getMemberSeqbyPersonalGroupInfo = async (database, member_seq, private_keys = null) => {
    const group_model = this.getGroupModel(database)
    return await group_model.getMemberSeqbyPersonalGroupInfo(member_seq, private_keys)
  }

  getGroupInfoWithProduct = async (database, group_seq, private_keys = null) => {
    const group_model = this.getGroupModel(database)
    return await group_model.getGroupInfoWithProduct(group_seq, private_keys)
  }

  getActiveGroupMemberSeqList = async (database, group_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getActiveGroupMemberSeqList(group_seq)
  }

  getAdminGroupMemberSeqList = async (database, group_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getAdminGroupMemberSeqList(group_seq)
  }

  inviteGroupMembers = async (database, group_member_info, member_info, request_body, service_domain) => {
    const group_seq = group_member_info.group_seq
    log.debug(this.log_prefix, '[inviteGroupMembers]', group_member_info.toJSON(), member_info.toJSON(), request_body, service_domain)
    if (Util.isEmpty(request_body)) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }
    const invite_email_list = request_body.invite_email_list
    const invite_message = request_body.invite_message
    log.debug(this.log_prefix, '[inviteGroupMembers]', request_body, invite_email_list, invite_message)
    if (!Util.isArray(invite_email_list)) {
      throw new StdObject(-1, '잘못된 요청입니다.', 400)
    }
    if (group_member_info.group_type === this.GROUP_TYPE_PERSONAL) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }

    const group_info_json = group_member_info.toJSON()
    const active_user_count = await this.getGroupMemberCount(database, group_seq)
    group_info_json.active_user_count = active_user_count

    for (let i = 0; i < invite_email_list.length; i++) {
      this.inviteGroupMember(member_info, group_info_json, invite_email_list[i], invite_message, service_domain)
    }
  }

  getAvailableInviteId = async (database) => {
    const group_member_model = this.getGroupMemberModel(database)
    let invite_code
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

  encryptInviteCode = (invite_code) => {
    return Util.encrypt(invite_code)
  }

  decryptInviteCode = (invite_code) => {
    return Util.decrypt(invite_code)
  }

  inviteGroupMember = (member_info, group_info, email_address, invite_message, service_domain) => {
    (
      async () => {
        let group_member_seq
        const group_seq = group_info.group_seq
        let group_member_info = await this.getGroupMemberInfoByInviteEmail(null, group_seq, email_address)
        if (!group_member_info.isEmpty() && group_member_info.status !== this.MEMBER_STATUS_DISABLE) {
          return
        }
        const invite_code = await this.getAvailableInviteId()

        const group_member_model = this.getGroupMemberModel(null)
        if (!group_member_info.isEmpty() && group_member_info.seq) {
          group_member_seq = group_member_info.seq
          await group_member_model.resetInviteInfo(group_member_seq, invite_code)
        } else {
          group_member_info = await group_member_model.createGroupInvite(group_seq, member_info.seq, invite_code, email_address)
          group_member_seq = group_member_info.seq
        }

        const title = `${group_info.group_name}의 ${member_info.user_name}님이 Surgstory에 초대하였습니다.`
        const encrypt_invite_code = this.encryptInviteCode(invite_code)
        const template_data = {
          service_domain,
          group_name: group_info.group_name,
          active_count: group_info.active_user_count,
          admin_name: member_info.user_name,
          invite_code,
          message: Util.nlToBr(invite_message),
          btn_link_url: `${service_domain}/v2/invite/group/${encrypt_invite_code}`
        }
        const body = GroupMailTemplate.inviteGroupMember(template_data, !invite_message)
        const send_mail_result = await new SendMail().sendMailHtml([email_address], title, body)
        log.debug(this.log_prefix, '[inviteGroupMember]', group_member_seq, email_address, title, send_mail_result.toJSON())
        if (send_mail_result.isSuccess() === false) {
          await group_member_model.updateInviteStatus(group_member_seq, 'E', send_mail_result.message)
          return
        }
        await group_member_model.updateInviteStatus(group_member_seq, 'Y')
      }
    )()
  }

  getInviteGroupInfo = async (database, input_invite_code, invite_seq = null, member_seq = null, is_encrypted = false) => {
    const invite_code = `${is_encrypted ? this.decryptInviteCode(input_invite_code) : input_invite_code}`.toUpperCase()
    const group_member_model = this.getGroupMemberModel(database)
    const group_invite_info = await group_member_model.getGroupInviteInfo(invite_code, invite_seq)
    if (group_invite_info.isEmpty()) {
      throw new StdObject(-1, '만료된 초대코드입니다.', 400)
    }
    if (invite_seq) {
      if (group_invite_info.invite_code !== input_invite_code) {
        throw new StdObject(-2, '초대코드가 일치하지 않습니다.', 400)
      }
    }
    group_invite_info.setIgnoreEmpty(true)
    const group_seq = group_invite_info.group_seq
    const group_name = group_invite_info.group_name
    if (group_invite_info.join_member_seq) {
      const output = new StdObject()
      if (member_seq) {
        if (group_invite_info.join_member_seq === member_seq) {
          throw this.getInviteMemberStatusError(group_seq, group_name, group_invite_info.group_member_status)
        } else {
          output.error = 11
          output.message = '만료된 초대코드입니다.'
        }
        output.httpStatusCode = 400
      } else {
        output.error = -2
        output.message = '만료된 초대코드입니다.'
      }
      throw output
    }
    if (group_invite_info.invite_status !== 'Y') {
      throw new StdObject(-3, '만료된 초대코드입니다.', 400)
    }
    if (group_invite_info.group_status !== this.GROUP_STATUS_ENABLE || group_invite_info.group_type === this.GROUP_TYPE_PERSONAL) {
      log.debug(this.log_prefix, '[getInviteGroupInfo]', 'check group status', group_invite_info.group_status, this.GROUP_STATUS_ENABLE, group_invite_info.group_type, this.GROUP_TYPE_PERSONAL)
      throw new StdObject(-4, '가입이 불가능한 팀입니다.', 400)
    }
    if (member_seq) {
      const group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
      log.debug(this.log_prefix, '[getInviteGroupInfo]', member_seq, group_member_info.toJSON())
      if (!group_member_info.isEmpty()) {
        throw this.getInviteMemberStatusError(group_seq, group_name, group_member_info.group_member_status)
      }
    }

    return group_invite_info
  }

  getInviteMemberStatusError = (group_seq, group_name, member_status) => {
    const output = new StdObject()
    if (member_status === this.MEMBER_STATUS_ENABLE) {
      output.error = 1
      output.message = '이미 가입된 팀입니다.'
      output.add('group_seq', group_seq)
      throw output
    } else if (member_status === this.MEMBER_STATUS_PAUSE) {
      output.error = 2
      output.message = `'${group_name}'팀 사용이 일시중지 되었습니다.`
    } else {
      output.error = 3
      output.message = `'${group_name}'팀에서 탈퇴되었습니다.`
    }
    return output
  }

  joinGroup = async (database, invite_seq, member_info, invite_code) => {
    const member_seq = member_info.seq
    invite_code = `${invite_code}`.toUpperCase()
    const group_member_model = this.getGroupMemberModel(database)
    const group_invite_info = await this.getInviteGroupInfo(database, invite_code, invite_seq, member_seq, false, true)

    await group_member_model.inviteConfirm(invite_seq, member_seq, group_invite_info.group_max_storage_size)

    const message_info = {
      title: '신규 회원 가입',
      message: `'${member_info.user_name}'님이 '${group_invite_info.group_name}'팀에 가입하셨습니다.`
    }
    await this.noticeGroupAdmin(group_invite_info.group_seq, null, message_info)

    return group_invite_info.group_seq
  }

  changeGradeAdmin = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberGrade(group_member_seq, this.MEMBER_GRADE_ADMIN)

    const title = `'${group_member_info.group_name}'팀의 SurgStory 관리자가 되었습니다.`
    const message_info = {
      title: '팀 관리자 권한 변경',
      message: title
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info, 'enableGroupAdmin', null)

    if (!group_member_info.invite_email) {
      return
    }

    const template_data = {
      service_domain,
      group_name: group_member_info.group_name,
      admin_name: admin_member_info.user_name,
      btn_link_url: `${service_domain}/`
    }
    const body = GroupMailTemplate.groupAdmin(template_data)
    const target_member_info = await this.getGroupMemberInfoBySeq(database, group_member_seq)
    this.sendEmail(title, body, [target_member_info.invite_email], 'changeGradeAdmin')
  }

  changeGradeNormal = async (database, group_member_info, group_member_seq) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberGrade(group_member_seq, this.MEMBER_GRADE_NORMAL)

    const title = `'${group_member_info.group_name}'팀의 SurgStory 관리자 권한이 해제되었습니다.`
    const message_info = {
      title: '팀 관리자 권한 변경',
      message: title,
      notice_type: 'alert'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info, 'disableGroupAdmin', null)
  }

  deleteMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain, is_delete_operation = true) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_seq = group_member_info.group_seq
    const target_member_info = await this.getGroupMemberInfoBySeq(database, group_member_seq)
    const group_member_model = this.getGroupMemberModel(database)
    let used_storage_size = null
    if (is_delete_operation) {
      await OperationService.deleteGroupMemberOperations(target_member_info.group_seq, target_member_info.member_seq)
      used_storage_size = 0
    }
    await group_member_model.banMember(group_member_seq, group_member_info.member_seq, used_storage_size)
    await this.updateGroupUsedStorage(database, group_seq)

    const title = `${group_member_info.group_name}의 SurgStory 팀원에서 제외되었습니다.`
    const message_info = {
      title: '팀 사용 불가',
      message: title,
      notice_type: 'alert'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info, 'disableUseGroup', null)

    if (!group_member_info.invite_email) {
      return
    }

    const template_data = {
      service_domain,
      group_name: group_member_info.group_name,
      admin_name: admin_member_info.user_name,
      btn_link_url: `${service_domain}/`
    }
    const body = GroupMailTemplate.deleteGroupMember(template_data)
    this.sendEmail(title, body, [target_member_info.invite_email], 'deleteMember')
  }

  unDeleteMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    await this.restoreMemberState(database, group_member_info, group_member_seq)

    const title = `${group_member_info.group_name}의 SurgStory 팀원으로 복원되었습니다.`
    const message_info = {
      title: title,
      message: '그룹을 선택하려면 클릭하세요.'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info)

    if (!group_member_info.invite_email) {
      return
    }

    const template_data = {
      service_domain,
      group_name: group_member_info.group_name,
      admin_name: admin_member_info.user_name,
      btn_link_url: `${service_domain}/`
    }
    const body = GroupMailTemplate.unDeleteGroupMember(template_data)
    const target_member_info = await this.getGroupMemberInfoBySeq(database, group_member_seq)
    this.sendEmail(title, body, [target_member_info.invite_email], 'unDeleteMember')
  }

  pauseMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberStatus(group_member_seq, this.MEMBER_STATUS_PAUSE)

    const title = `${group_member_info.group_name}의 SurgStory 사용 일시중단 되었습니다.`
    const message_info = {
      title: '팀 사용 불가',
      message: title,
      notice_type: 'alert'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info, 'disableUseGroup', null)

    if (!group_member_info.invite_email) {
      return
    }

    const template_data = {
      service_domain,
      group_name: group_member_info.group_name,
      admin_name: admin_member_info.user_name,
      btn_link_url: `${service_domain}/`
    }
    const body = GroupMailTemplate.pauseGroupMember(template_data)
    const target_member_info = await this.getGroupMemberInfoBySeq(database, group_member_seq)
    this.sendEmail(title, body, [target_member_info.invite_email], 'pauseMember')
  }

  unPauseMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    await this.restoreMemberState(database, group_member_info, group_member_seq)
    const title = `${group_member_info.group_name}의 SurgStory 사용 일시중단이 해제 되었습니다.`
    const message_info = {
      title: title,
      message: '그룹을 선택하려면 클릭하세요.'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info)

    if (!group_member_info.invite_email) {
      return
    }

    const template_data = {
      service_domain,
      group_name: group_member_info.group_name,
      admin_name: admin_member_info.user_name,
      btn_link_url: `${service_domain}/`
    }
    const body = GroupMailTemplate.unPauseGroupMember(template_data)
    const target_member_info = await this.getGroupMemberInfoBySeq(database, group_member_seq)
    this.sendEmail(title, body, [target_member_info.invite_email], 'unDeleteMember')
  }

  sendEmail = (title, body, mail_to_list, method = '') => {
    (
      async () => {
        const send_mail_result = await new SendMail().sendMailHtml(mail_to_list, title, body)
        log.debug(this.log_prefix, '[sendEmail]', method, send_mail_result)
      }
    )()
  }

  deleteInviteMail = async (database, group_member_info, group_member_seq) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.deleteInviteInfo(group_member_info.group_seq, group_member_seq)
  }

  restoreMemberState = async (database, group_member_info, group_member_seq) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.restoreMemberStatus(group_member_seq)
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

  getGroupSummary = async (database, group_seq) => {
    const group_info = await this.getGroupInfoWithProduct(database, group_seq)
    const group_member_model = this.getGroupMemberModel(database)
    const group_summary = await group_member_model.getGroupMemberSummary(group_seq)
    return {
      group_info,
      group_summary
    }
  }

  updateGroupMemberMaxStorageSize = async (database, group_seq, max_storage_size) => {
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.updateGroupMemberMaxStorageSize(group_seq, max_storage_size)
  }

  // 아래 함수는 결재 완료 후 group_info에 필요한 데이터만 업데이트 용으로 사용합니다.
  // 추 후 group_member에도 업데이트 할 예정이므로 파라미터만 추가 해 놓습니다.
  // 2020.03.04 NJH
  updatePaymentToGroup = async (database, filter, pay_code, storage_size, expire_month_code, toStart_date = null, toExpire_date = null) => {
    log.debug(this.log_prefix, '[updatePaymentToGroup]', filter, pay_code, storage_size, expire_month_code)
    const member_seq = filter.member_seq
    const group_type = filter.group_type
    const start_date = toStart_date !== null ? toStart_date : Util.getCurrentTimestamp()
    const expire_date = toExpire_date !== null ? toExpire_date : expire_month_code === null ? null : this.getExpireTimeStamp(expire_month_code)

    const payment_info = {
      pay_code,
      storage_size,
      status: pay_code === 'free' ? 'F' : 'Y',
      start_date,
      expire_date
    }

    const member_info = await MemberService.getMemberInfo(database, member_seq)
    let group_info = null
    await database.transaction(async (transaction) => {
      const group_model = this.getGroupModel(transaction)
      group_info = await group_model.getGroupInfoByMemberSeqAndGroupType(member_seq, group_type)
      if (group_info && !group_info.isEmpty()) {
        await group_model.changePlan(group_info, payment_info)
      } else {
        if (group_type === 'G') {
          group_info = await this.createEnterpriseGroup(transaction, member_info, payment_info)
        } else {
          group_info = await this.createPersonalGroup(transaction, member_info, payment_info)
        }
      }
      await this.updateGroupMemberMaxStorageSize(database, group_info.seq, storage_size)
    })

    const sub_type = 'planChange'
    const message_info = {
      title: '팀 플랜이 변경되었습니다.',
      message: `'${group_info.group_name}'팀 플랜이 변경되었습니다.`
    }
    await this.onGroupStateChange(group_info.seq, sub_type, null, null, message_info, false)

    return group_info
  }

  getExpireTimeStamp = (expire_month_code) => {
    if (expire_month_code === 'year') {
      return Util.addYear(1, Constants.TIMESTAMP)
    }
    return Util.addMonth(1, Constants.TIMESTAMP)
  }

  noticeGroupAdmin = async (group_seq, action_type = null, message_info = null) => {
    const admin_id_list = await this.getAdminGroupMemberSeqList(DBMySQL, group_seq)
    if (!admin_id_list || !admin_id_list.length) {
      return
    }
    const data = {
      type: 'groupMemberStateChange',
      group_seq
    }
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti(admin_id_list, data, message_info)
  }

  onGroupMemberStateChange = async (group_seq, group_member_seq, message_info = null, type = 'groupMemberStateChange', action_type = 'groupSelect') => {
    const group_member_model = this.getGroupMemberModel(DBMySQL)
    const user_id = await group_member_model.getGroupMemberSeq(group_member_seq)
    if (!user_id) {
      return
    }
    const data = {
      type,
      group_seq,
      action_type
    }
    await this.sendToFrontOne(user_id, data, message_info)
  }

  onGroupStateChange = async (group_seq, sub_type = null, action_type = null, operation_seq_list = null, message_info = null, reload_operation_list = true) => {
    const user_id_list = await this.getActiveGroupMemberSeqList(DBMySQL, group_seq)
    if (!user_id_list || !user_id_list.length) return
    const data = {
      type: 'groupStorageInfoChange',
      group_seq,
      reload_operation_list
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type
    if (operation_seq_list) data.operation_seq_list = operation_seq_list

    await this.sendToFrontMulti(user_id_list, data, message_info)
  }

  onGeneralGroupNotice = async (group_seq, type, action_type = null, sub_type = null, message_info = null, extra_data = null) => {
    const user_id_list = await this.getActiveGroupMemberSeqList(DBMySQL, group_seq)
    if (!user_id_list || !user_id_list.length) return
    const data = {
      type,
      group_seq,
      ...extra_data
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti(user_id_list, data, message_info)
  }

  sendToFrontOne = async (user_id, data, message_info) => {
    const socket_data = {
      data
    }
    if (message_info) {
      message_info.type = 'pushNotice'
      socket_data.message_info = message_info
    }
    await SocketManager.sendToFrontOne(user_id, socket_data)
  }

  sendToFrontMulti = async (user_id_list, data, message_info) => {
    const socket_data = {
      data
    }
    if (message_info) {
      message_info.type = 'pushNotice'
      socket_data.message_info = message_info
    }
    await SocketManager.sendToFrontMulti(user_id_list, socket_data)
  }

  getUserGroupInfo = async (database, member_seq) => {
    const group_info_model = this.getGroupModel(database)
    return await group_info_model.getMemberGroupInfoAll(member_seq)
  }

  getAllPersonalGroupUserListForBox = async (database) => {
    const result_list = []
    const group_info_model = this.getGroupModel(database)
    const user_list = await group_info_model.getAllPersonalGroupUserList()
    for (let i = 0; i < user_list.length; i++) {
      const user_info = user_list[i]
      const member_info = {
        'seq': user_info.member_seq,
        'group_seq': user_info.group_seq
      }
      const treat_code = user_info.treatcode ? JSON.parse(user_info.treatcode) : null
      const token_result = await Auth.getTokenResult(null, member_info, Role.API, true)
      result_list.push({
        'user_name': user_info.user_name,
        'user_id': user_info.user_id,
        'user_token': token_result.get('token'),
        'course_name': treat_code && treat_code.length > 0 ? treat_code[0].text : ''
      })
    }
    return result_list
  }

  getPersonalGroupUserForBox = async (database, user_id) => {
    const group_info_model = this.getGroupModel(database)
    const user_info = await group_info_model.getPersonalGroupUserForBox(user_id)
    let result = null
    if (user_info) {
      const member_info = {
        'seq': user_info.member_seq,
        'group_seq': user_info.group_seq
      }
      const treat_code = user_info.treatcode ? JSON.parse(user_info.treatcode) : null
      const token_result = await Auth.getTokenResult(null, member_info, Role.API, true)
      result = {
        'user_name': user_info.user_name,
        'user_id': user_info.user_id,
        'user_token': token_result.get('token'),
        'course_name': treat_code && treat_code.length > 0 ? treat_code[0].text : ''
      }
    }
    return result
  }

  getGroupSeqByMemberInfo = async (database, group_seq) => {
    const group_info_model = this.getGroupModel(database)
    return await group_info_model.getGroupSeqByMemberInfo(group_seq)
  }

  getGroupCountsInfo = async (database, group_seq) => {
    try {
      const group_count_model = this.getGroupCountsModel(database)
      let group_count_info = await group_count_model.getCounts(group_seq)
      if (!group_count_info || !group_count_info.seq) {
        await group_count_model.createCounts(group_seq)
        group_count_info = await group_count_model.getCounts(group_seq)
      }
      return group_count_info
    } catch (e) {
      throw e
    }
  }

  UpdateGroupInfoAddCnt = async (database, group_seq, field_name) => {
    try {
      const group_count_model = this.getGroupCountsModel(database)
      const group_count_info = await this.getGroupCountsInfo(database, group_seq)
      return await group_count_model.AddCount(group_count_info.seq, field_name)
    } catch (e) {
      throw e
    }
  }

  UpdateGroupInfoMinusCnt = async (database, group_seq, field_name) => {
    try {
      const group_count_model = this.getGroupCountsModel(database)
      const group_count_info = await this.getGroupCountsInfo(database, group_seq)
      return await group_count_model.MinusCount(group_count_info.seq, field_name)
    } catch (e) {
      throw e
    }
  }

  changeGroupProfileImage = async (database, group_member_info, request, response) => {
    const output = new StdObject(-1, '프로필 업로드 실패')

    const media_root = ServiceConfig.get('media_root')
    const upload_path = group_member_info.media_path + `/profile`
    const upload_full_path = media_root + upload_path
    if (!(await Util.fileExists(upload_full_path))) {
      await Util.createDirectory(upload_full_path)
    }
    try {
      const new_file_name = Util.getRandomId()
      await Util.uploadByRequest(request, response, 'profile', upload_full_path, new_file_name)
    } catch (e) {
      throw e
    }
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw output
    }

    log.debug(upload_file_info)
    const origin_image_path = upload_file_info.path
    const resize_image_path = `${upload_path}/${Util.getRandomId()}.${Util.getFileExt(upload_file_info.filename)}`
    const resize_image_full_path = media_root + resize_image_path
    const resize_result = await Util.getThumbnail(origin_image_path, resize_image_full_path, 0, 300, 400)

    await Util.deleteFile(origin_image_path)

    if (resize_result.success) {
      const group_model = this.getGroupModel(database)
      const update_profile_result = await group_model.updateProfileImage(group_member_info.group_seq, resize_image_path)
      if (update_profile_result) {
        if (!Util.isEmpty(group_member_info.profile_image_path)) {
          await Util.deleteFile(media_root + group_member_info.profile_image_path)
        }
        output.error = 0
        output.message = ''
        output.add('profile_image_url', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), resize_image_path))
        return output
      } else {
        await Util.deleteFile(resize_image_full_path)
        output.error = -4
      }
    } else {
      output.error = -5
    }

    throw output
  }

  getGroupInfoToGroupCounts = async (database, group_seq) => {
    try {
      const group_model = this.getGroupModel(database)
      const result = await group_model.getGroupInfoToGroupCounts(group_seq)
      if (result && result.profile_image_path) {
        result.profile_image_url = ServiceConfig.get('static_storage_prefix') + result.profile_image_path
      }
      return result
    } catch (e) {
      throw e
    }
  }

  updateGroupInfoHashTag = async (database, group_seq, hashtag_list) => {
    try {
      const group_model = this.getGroupModel(database)
      const group_hashtag = await group_model.getGroupInfoHashtag(group_seq)
      let save_group_hashtag = []
      if (group_hashtag.hashtag === null) {
        _.forEach(hashtag_list, (item) => {
          const json_item = {
            text: item,
            count: 1,
          }
          save_group_hashtag.push(json_item)
        })
      } else {
        save_group_hashtag = JSON.parse(group_hashtag.hashtag)
        _.forEach(hashtag_list, (item) => {
          const hashtag_check = _.filter(save_group_hashtag, function (hashtag) {
            return hashtag.text === item
          })
          if (hashtag_check.length > 0) {
            const group_hashtag_item = _.find(save_group_hashtag, { text: item })
            group_hashtag_item.count = group_hashtag_item.count + 1
          } else {
            const json_item = {
              text: item,
              count: 1,
            }
            save_group_hashtag.push(json_item)
          }
        })
      }

      const sort_by_save_group_hashtag = _.chain(save_group_hashtag)
        .orderBy(['count'], ['desc'])
        .take(10)
        .value()

      await group_model.updateGroupInfoHashTag(group_seq, sort_by_save_group_hashtag)
    } catch (e) {
      log.error(this.log_prefix, '[updateGroupInfoHashTag]', e)
    }
  }

  changeGroupName = async (group_seq, group_name) => {
    try {
      await DBMySQL.transaction(async (transaction) => {
        const group_model = this.getGroupModel(transaction)
        await group_model.changeGroupName(group_seq, group_name)
        await OperationDataService.changeGroupName(transaction, group_seq, group_name)
      })
      return true
    } catch (e) {
      log.error(this.log_prefix, '[changeGroupName]', e)
      throw new StdObject(-2, '그룹명을 변경할 수 없습니다.', 400)
    }
  }

  isDuplicateGroupName = async (database, group_name) => {
    const group_model = this.getGroupModel(database)
    return await group_model.isDuplicateGroupName(group_name)
  }
}

const group_service = new GroupServiceClass()

export default group_service
