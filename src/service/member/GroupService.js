import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberService from './MemberService'
import GroupModel from '../../database/mysql/member/GroupModel';
import GroupMemberModel from '../../database/mysql/member/GroupMemberModel';
import GroupInviteModel from '../../database/mysql/member/GroupInviteModel';
import GroupInfo from "../../wrapper/member/GroupInfo";
import GroupMemberInfo from "../../wrapper/member/GroupMemberInfo";
import GroupInviteInfo from "../../wrapper/member/GroupInviteInfo";
import MemberModel from '../../database/mysql/member/MemberModel'
import SendMail from '../../libs/send-mail'
import MemberTemplate from '../../template/mail/member.template'

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

  getGroupInviteModel = (database) => {
    if (database) {
      return new GroupInviteModel(database)
    }
    return new GroupInviteModel(DBMySQL)
  }

  createPersonalGroup = async (database, member_info, options = {}) => {
    const storage_size = Util.parseInt(options.storage_size, 0)
    const used_storage_size = Util.parseInt(options.used_storage_size, 0)
    const create_group_info = {
      member_seq: member_info.seq,
      group_type: 'P',
      state: 'F',
      group_name: member_info.name,
      storage_size: storage_size > 0 ? storage_size : Util.parseInt(ServiceConfig.get('default_storage_size')),
      used_storage_size
    }
    const group_model = this.getGroupModel(database)
    const group_info = await group_model.createGroup(create_group_info)

    const create_group_member_info = {
      group_seq: group_info.seq,
      member_seq: member_info.seq,
      max_storage_size: group_info.storage_size,
      used_storage_size: group_info.used_storage_size,
      grade: 'O',
      state: 'Y',
      join_date: Util.getCurrentTimestamp()
    }
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_info = await group_member_model.createGroupMember(create_group_member_info)
    if (!options.result_by_object) {
      return group_info
    }

    const result = {
      group_info
    }

    if (options.return_width_model) {
      result.group_model = group_model
      result.group_member_model = group_member_model
    }
    if (options.return_width_member_info) {
      result.group_member_info = group_member_info
    }
    return result
  }

  addGroupMember = async (database, group_info, member_seq) => {
    if (group_info.group_type === 'P') {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }
    const add_group_member_info = {
      group_seq: group_info.seq,
      member_seq,
      max_storage_size: group_info.storage_size,
      used_storage_size: 0,
      grade: 'N',
      state: 'Y',
      join_date: Util.getCurrentTimestamp()
    }
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_info = await group_member_model.createGroupMember(add_group_member_info)
    return group_member_info
  }

  getMemberGroupList = async (database, member_seq, is_active_only = true) => {
    const state = is_active_only ? 'Y' : null
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getMemberGroupList(member_seq, state)
  }

  getGroupMemberList = async (database, group_seq, is_active_only = false) => {
    const state = is_active_only ? 'Y' : null
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberList(group_seq, state)
  }

  getGroupMemberCount = async (database, group_seq, is_active_only = true) => {
    const state = is_active_only ? 'Y' : null
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberCount(group_seq, state)
  }

  getGroupMemberInfo = async (database, group_seq, member_seq) => {
    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.getGroupMemberCount(group_seq, member_seq)
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
      const group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
      if (group_member_info.isEmpty()) {
        throw new StdObject(-1, '그룹에 속한 회원이 아닙니다.', 400)
      }
      if (group_member_info.grade !== 'A' && group_member_info.grade !== 'O') {
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
      )(owner_info, group_info, invite_email_list[i])
    }
  }

  inviteGroupMember = async (database, owner_info, group_info, email_address) => {
    const invite_id = Util.getContentId()
    const invite_code = Util.getRandomString(8)

    const create_invite_params = {
      invite_id,
      invite_code,
      group_seq: group_info.seq,
      email: email_address,
      state: 'N'
    }
    const group_invite_model = this.getGroupInviteModel(database)
    const group_invite_info = await group_invite_model.createGroupInvite(create_invite_params)

    const title = `<b>${owner_info.hospname}</b>의 ${owner_info.user_name}님이 Surgstory에 초대하였습니다.`
    const body = ``
    const send_mail_result = await new SendMail().sendMailHtml([group_invite_info.email_address], title, body);
    if (send_mail_result.isSuccess() === false) {
      throw send_mail_result;
    }
  }
}

const group_service = new GroupServiceClass()

export default group_service
