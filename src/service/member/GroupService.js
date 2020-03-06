import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberService from './MemberService'
import OperationService from '../operation/OperationService'
import SocketManager from '../socket-manager'
import GroupModel from '../../database/mysql/member/GroupModel';
import GroupMemberModel from '../../database/mysql/member/GroupMemberModel';
import SendMail from '../../libs/send-mail'
import GroupMailTemplate from '../../template/mail/group.template'

const GroupServiceClass = class {
  constructor () {
    this.log_prefix = '[GroupServiceClass]'
    this.GROUP_TYPE_PERSONAL = 'P'
    this.GROUP_TYPE_ENTERPRISE = 'G'
    this.GROUP_STATUS_FREE = 'F'
    this.GROUP_STATUS_ENABLE = 'F'
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
    let is_active_group_member = false
    if ( token_info.getRole() === Role.ADMIN ) {
      is_active_group_member = true
    } else if (check_group_auth) {
      if (!group_seq) {
        is_active_group_member = false
      } else {
        group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
        is_active_group_member = group_member_info && group_member_info.group_member_status === this.MEMBER_STATUS_ENABLE
      }
    }
    if ( !is_active_group_member && throw_exception) {
      throw new StdObject(-1, '권한이 없습니다', 403)
    }
    return {
      token_info,
      member_seq,
      group_seq,
      member_info,
      group_member_info,
      is_active_group_member
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
      group_name: member_info.user_name,
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
    log.debug(this.log_prefix, '[createGroupInfo]', create_group_info, member_seq)
    const group_model = this.getGroupModel(database)
    const group_info = await group_model.createGroup(create_group_info)
    const group_member_info = await this.addGroupMember(database, group_info, member_info, this.MEMBER_GRADE_OWNER)

    return group_info
  }

  addGroupMember = async (database, group_info, member_info, grade, max_storage_size = 0) => {
    if (grade !== this.MEMBER_GRADE_OWNER && group_info.group_type === this.GROUP_TYPE_PERSONAL) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }

    const group_member_model = this.getGroupMemberModel(database)
    const group_member_info = await group_member_model.createGroupMember(group_info, member_info, grade, max_storage_size)
    return group_member_info
  }

  getMemberGroupList = async (database, member_seq, is_active_only = true) => {
    log.debug(this.log_prefix, '[getMemberGroupList]', member_seq, is_active_only)
    const status = is_active_only ? this.MEMBER_STATUS_ENABLE : null
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getMemberGroupList(member_seq, status)
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
    return await group_member_model.getMemberGroupInfoWithGroup(group_seq, member_seq, status)
  }

  getGroupMemberInfoBySeq = async (database, group_member_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberInfoBySeq(group_member_seq)
  }

  getGroupMemberInfoByInviteEmail = async (database, group_seq, email_address) => {
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_info = await group_member_model.getGroupMemberInfoByInviteEmail(group_seq, email_address)
    return group_member_info
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
    return await group_model.getGroupInfo(group_seq, private_keys)
  }

  getGroupInfoWithProduct = async (database, group_seq, private_keys = null) => {
    const group_model = this.getGroupModel(database)
    return await group_model.getGroupInfoWithProduct(group_seq, private_keys)
  }

  getActiveGroupMemberIdList = async (database, group_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getActiveGroupMemberIdList(group_seq)
  }

  getAdminGroupMemberIdList = async (database, group_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getAdminGroupMemberIdList(group_seq)
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
      (
        async (member_info, group_info, email_address, invite_message, service_domain) => {
          try {
            await this.inviteGroupMember(null, member_info, group_info, email_address, invite_message, service_domain)
          } catch (error) {
            log.error(this.log_prefix, '[inviteGroupMembers]', error)
          }
        }
      )(member_info, group_info_json, invite_email_list[i], invite_message, service_domain)
    }
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

  encryptInviteCode = (invite_code) => {
    return Util.encrypt(invite_code)
  }

  decryptInviteCode = (invite_code) => {
    return Util.decrypt(invite_code)
  }

  inviteGroupMember = async (database, member_info, group_info, email_address, invite_message, service_domain) => {
    let group_member_seq;
    const group_seq = group_info.group_seq
    let group_member_info = await this.getGroupMemberInfoByInviteEmail(database, group_seq, email_address)
    if (!group_member_info.isEmpty() && group_member_info.status !== this.MEMBER_STATUS_DISABLE) {
      return
    }
    const invite_code = await this.getAvailableInviteId()

    const group_member_model = this.getGroupMemberModel(database)
    if (!group_member_info.isEmpty() && group_member_info.seq) {
      group_member_seq = group_member_info.seq
      await group_member_model.resetInviteInfo(group_member_seq, invite_code)
    } else {
      group_member_info = await group_member_model.createGroupInvite(group_seq, member_info.seq, invite_code, email_address)
      group_member_seq = group_member_info.seq
    }

    const title = `${group_info.group_name}의 ${member_info.user_name}님이 Surgstory에 초대하였습니다.`
    const encrypt_invite_code = this.encryptInviteCode(invite_code);
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
    const send_mail_result = await new SendMail().sendMailHtml([email_address], title, body);
    if (send_mail_result.isSuccess() === false) {
      await group_member_model.updateInviteStatus(group_member_seq, 'E', send_mail_result.message)
      return
    }
    await group_member_model.updateInviteStatus(group_member_seq, 'Y')
  }

  getInviteGroupInfo = async (database, input_invite_code, invite_seq = null, member_seq = null, is_encrypted = false) => {
    const invite_code = `${is_encrypted ? this.decryptInviteCode(input_invite_code) : input_invite_code}`.toUpperCase();
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
      const output = new StdObject();
      if (member_seq) {
        if (group_invite_info.join_member_seq === member_seq) {
          throw this.getInviteMemberStatusError(group_seq, group_name, group_invite_info.group_member_status);
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
      throw new StdObject(-4, '가입이 불가능한 팀입니다.', 400)
    }
    if (member_seq) {
      const group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
      log.debug(this.log_prefix, '[getInviteGroupInfo]', member_seq, group_member_info.toJSON())
      if (!group_member_info.isEmpty()) {
        throw this.getInviteMemberStatusError(group_seq, group_name, group_member_info.group_member_status);
      }
    }

    return group_invite_info;
  }

  getInviteMemberStatusError = (group_seq, group_name, member_status) => {
    const output = new StdObject();
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
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, null, message_info)

    if (!group_member_info.invite_email) {
      return
    }

    (
      async () => {
        const template_data = {
          service_domain,
          group_name: group_member_info.group_name,
          admin_name: admin_member_info.user_name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.groupAdmin(template_data)
        const send_mail_result = await new SendMail().sendMailHtml([group_member_info.invite_email], title, body);
        log.debug(this.log_prefix, '[changeGradeAdmin]', send_mail_result)
      }
    )()
  }

  changeGradeNormal = async (database, group_member_info, group_member_seq ) => {
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
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, null, message_info)
  }

  deleteMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain, is_delete_operation= true) => {
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
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, 'selectGroupForce', message_info)

    if (!group_member_info.invite_email) {
      return
    }

    (
      async () => {
        const template_data = {
          service_domain,
          group_name: group_member_info.group_name,
          admin_name: admin_member_info.user_name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.deleteGroupMember(template_data)
        const send_mail_result = await new SendMail().sendMailHtml([group_member_info.invite_email], title, body);
        log.debug(this.log_prefix, '[deleteMember]', send_mail_result)
      }
    )()
  }

  unDeleteMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    await this.restoreMemberState(database, group_member_info, group_member_seq)

    const title = `${group_member_info.group_name}의 SurgStory 팀원으로 복원되었습니다.`
    const message_info = {
      title: title,
      message: '그룹을 선택하려면 클릭하세요.'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, 'selectGroup', message_info)

    if (!group_member_info.invite_email) {
      return
    }

    (
      async () => {
        const template_data = {
          service_domain,
          group_name: group_member_info.group_name,
          admin_name: admin_member_info.user_name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.unDeleteGroupMember(template_data)
        const send_mail_result = await new SendMail().sendMailHtml([group_member_info.invite_email], title, body);
        log.debug(this.log_prefix, '[unDeleteMember]', send_mail_result)
      }
    )()
  }

  pauseMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberStatus(group_member_seq, this.MEMBER_STATUS_PAUSE);

    const title = `${group_member_info.group_name}의 SurgStory 사용 일시중단 되었습니다.`
    const message_info = {
      title: '팀 사용 불가',
      message: title,
      notice_type: 'alert'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, 'selectGroupForce', message_info)

    if (!group_member_info.invite_email) {
      return
    }

    (
      async () => {
        const template_data = {
          service_domain,
          group_name: group_member_info.group_name,
          admin_name: admin_member_info.user_name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.pauseGroupMember(template_data)
        const send_mail_result = await new SendMail().sendMailHtml([group_member_info.invite_email], title, body);
        log.debug(this.log_prefix, '[pauseMember]', send_mail_result)
      }
    )()
  }

  unPauseMember = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    await this.restoreMemberState(database, group_member_info, group_member_seq);
    const title = `${group_member_info.group_name}의 SurgStory 사용 일시중단이 해제 되었습니다.`
    const message_info = {
      title: title,
      message: '그룹을 선택하려면 클릭하세요.'
    }
    await this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, 'selectGroup', message_info)

    if (!group_member_info.invite_email) {
      return
    }

    (
      async () => {
        const template_data = {
          service_domain,
          group_name: group_member_info.group_name,
          admin_name: admin_member_info.user_name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.unPauseGroupMember(template_data)
        const send_mail_result = await new SendMail().sendMailHtml([group_member_info.invite_email], title, body);
        log.debug(this.log_prefix, '[unDeleteMember]', send_mail_result)
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
  updatePaymentToGroup = async (database, filter, pay_code, storage_size, expire_month_code) => {
    log.debug(this.log_prefix, '[updatePaymentToGroup]', filter, pay_code, storage_size, expire_month_code)
    const member_seq = filter.member_seq
    const group_type = filter.group_type
    const start_date = Util.getCurrentTimestamp()
    const expire_date = this.getExpireTimeStamp(expire_month_code)

    const payment_info = {
      pay_code,
      storage_size,
      start_date,
      expire_date
    }

    const member_info = await MemberService.getMemberInfo(database, member_seq)
    let group_info = null
    await database.transaction(async(transaction) => {
      const group_model = this.getGroupModel(transaction);
      group_info = group_model.getGroupInfoByMemberSeqAndGroupType(member_seq, group_type)
      if (group_info) {
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

    return group_info;
  }

  getExpireTimeStamp = (expire_month_code) => {
    if (expire_month_code === 'year') {
      return Util.addYear(1, Constants.TIMESTAMP)
    }
    return Util.addMonth(1, Constants.TIMESTAMP)
  }

  noticeGroupAdmin = async (group_seq, action_type = null, message_info = null) => {
    const admin_id_list = await this.getAdminGroupMemberIdList(DBMySQL, group_seq)
    if (!admin_id_list || !admin_id_list.length) {
      return
    }
    const data = {
      type: 'groupMemberStateChange',
      group_seq
    }
    if (action_type) data.action_type = action_type

    const socket_data = {
      data
    }
    if (message_info) {
      message_info.type = 'pushNotice'
      socket_data.message_info = message_info
    }
    await SocketManager.sendToFrontMulti(admin_id_list, socket_data)
  }

  onGroupMemberStateChange = async (group_seq, group_member_seq, action_type = null, message_info = null) => {
    const group_member_model = this.getGroupMemberModel(DBMySQL)
    const user_id = await group_member_model.getGroupMemberId(group_member_seq)
    if (!user_id) {
      return
    }
    const data = {
      type: 'groupMemberStateChange',
      group_seq
    }
    if (action_type) data.action_type = action_type

    const socket_data = {
      data
    }
    if (message_info) {
      message_info.type = 'pushNotice'
      socket_data.message_info = message_info
    }
    await SocketManager.sendToFrontOne(user_id, socket_data)
  }

  onGroupStorageInfoChange = async (group_seq, sub_type = null, action_type = null, operation_seq_list = null, message_info = null) => {
    const user_id_list = await this.getActiveGroupMemberIdList(DBMySQL, group_seq)
    if (!user_id_list || !user_id_list.length) return
    const data = {
      type: 'groupStorageInfoChange',
      group_seq
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type
    if (operation_seq_list) data.operation_seq_list = operation_seq_list

    const socket_data = {
      data
    }
    if (message_info) {
      message_info.type = 'pushNotice'
      socket_data.message_info = message_info
    }
    await SocketManager.sendToFrontMulti(user_id_list, socket_data)
  }
}

const group_service = new GroupServiceClass()

export default group_service
