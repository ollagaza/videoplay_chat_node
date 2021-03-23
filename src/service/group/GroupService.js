import _ from 'lodash'
import ServiceConfig from '../service-config'
import Util from '../../utils/Util'
import Role from '../../constants/roles'
import Constants from '../../constants/constants'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import MemberService from '../member/MemberService'
import OperationService from '../operation/OperationService'
import OperationModel from "../../database/mysql/operation/OperationModel";
import OperationDataService from '../operation/OperationDataService'
import SocketManager from '../socket-manager'
import GroupModel from '../../database/mysql/group/GroupModel'
import GroupMemberModel from '../../database/mysql/group/GroupMemberModel'
import SendMail from '../../libs/send-mail'
import GroupMailTemplate from '../../template/mail/group.template'
import VacsService from '../vacs/VacsService'
import Auth from '../../middlewares/auth.middleware'
import GroupCountModel from '../../database/mysql/group/GroupCountsModel'
import ContentCountsModel from '../../database/mysql/member/ContentCountsModel'
import JsonWrapper from '../../wrapper/json-wrapper'
import GroupGradeModel from "../../database/mysql/group/GroupGradeModel";
import OperationCommentService from '../operation/OperationCommentService'
import GroupBoardDataService from "../board/GroupBoardDataService";
import OperationClipService from "../operation/OperationClipService";
import OperationFolderService from "../operation/OperationFolderService";
import GroupBoardListService from "../board/GroupBoardListService";
import striptags from "striptags";
import GroupAlarmService from './GroupAlarmService'

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
    this.MEMBER_STATUS_BAN = 'B'
    this.MEMBER_STATUS_PAUSE = 'P'
    this.MEMBER_STATUS_JOIN = 'J'
    this.MEMBER_STATUS_DISABLE_NO_VIEW = 'L'
    this.MEMBER_STATUS_NORMAL = 'N'
    this.MEMBER_STATUS_DELETE = 'D'
    this.MEMBER_GRADE_OWNER = 'O'
    this.MEMBER_GRADE_ADMIN = 'A'
    this.MEMBER_GRADE_MANAGER = '6'
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

  getGroupGradeModel = (database) => {
    if (database) {
      return new GroupGradeModel(database)
    }
    return new GroupGradeModel(DBMySQL)
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

  checkGroupAuth = async (database, req, group_seq_from_token = true, check_group_auth = true, throw_exception = false, only_admin = false) => {
    const { token_info, member_seq, group_seq } = this.getBaseInfo(req, group_seq_from_token)
    const member_info = await MemberService.getMemberInfo(database, member_seq)
    if (!MemberService.isActiveMember(member_info)) {
      throw MemberService.getMemberStateError(member_info)
    }
    let group_member_info = null
    let is_active_group_member = false
    let is_group_admin = false
    let is_group_manager = false
    let group_grade = 0
    let group_grade_number = 0
    // if (token_info.getRole() === Role.ADMIN) {
    //   is_active_group_member = true
    //   is_group_admin = true
    //   is_group_manager = true
    //   group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
    // } else
    if (check_group_auth) {
      if (!group_seq) {
        is_active_group_member = false
      } else {
        group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
        is_active_group_member = group_member_info && group_member_info.group_member_status === this.MEMBER_STATUS_ENABLE
        is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
        is_group_manager = this.isGroupManagerByMemberInfo(group_member_info)
        group_grade = group_member_info.grade
        if (is_group_admin) {
          group_grade_number = 99
        } else {
          group_grade_number = Util.parseInt(group_grade, 0)
        }
      }
    }
    if (check_group_auth && !is_active_group_member && throw_exception) {
      let error_code = 10001
      let message = '권한이 없습니다'
      if (group_member_info) {
        const status = group_member_info.group_member_status
        if (status === this.MEMBER_STATUS_PAUSE) {
          message = '채널 사용이 정지되었습니다.';
        } else if (status === this.MEMBER_STATUS_DISABLE || status === this.MEMBER_STATUS_BAN) {
          message = '탈퇴한 채널입니다.';
        }
      }
      throw new StdObject(error_code, message, 403)
    }
    if (only_admin && !is_group_admin) {
      throw new StdObject(10000, '권한이 없습니다', 403)
    }
    return {
      token_info: token_info,
      member_seq: member_seq,
      group_seq: group_seq,
      member_info: member_info,
      group_member_info: group_member_info,
      is_active_group_member: is_active_group_member,
      is_group_admin: is_group_admin,
      is_group_manager: is_group_manager,
      group_grade: group_grade,
      group_grade_number: group_grade_number
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
    const is_set_group_name = !Util.isEmpty(options.is_set_group_name) ? options.is_set_group_name : 1

    const create_group_info = {
      member_seq: member_info.seq,
      group_type: this.GROUP_TYPE_ENTERPRISE,
      status,
      group_name: options.group_name ? options.group_name : member_info.user_nickname,
      storage_size: storage_size > 0 ? storage_size : Util.parseInt(ServiceConfig.get('default_storage_size')) * Constants.GB,
      used_storage_size: 0,
      is_set_group_name,
      pay_code,
      start_date,
      expire_date,
      group_open: options.group_open ? options.group_open : 0,
      group_join_way: options.group_join_way ? options.group_join_way : 1,
      member_open: options.member_open ? options.member_open : 0,
      member_name_used: options.member_name_used ? options.member_name_used : 0,
      search_keyword: options.search_keyword ? JSON.stringify(options.search_keyword) : null,
      group_explain: options.group_explain ? options.group_explain : null,
      profile_image_path: options.profile_image_path ? options.profile_image_path : null,
    }
    if (ServiceConfig.isVacs()) {
      create_group_info.is_channel = 1
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
    await this.createDefaultGroupGrade(database, group_info.seq)
    await OperationFolderService.createDefaultOperationFolder(database, group_info.seq, group_info.member_seq)
    await GroupBoardListService.createDefaultGroupBoard(database, group_info.seq)
    const group_counts_model = this.getGroupCountsModel(database)
    await group_counts_model.createCounts(group_info.seq)
    const content_counts_model = this.getContentCountsModel(database)
    await content_counts_model.createContentCount('all', group_info.seq)
    await this.addGroupMember(database, group_info, member_info, this.MEMBER_GRADE_OWNER)

    return group_info
  }

  updateEnterpriseGroup = async (database, member_info, options, seq = {}) => {
    const modify_group_info = {
      group_type: this.GROUP_TYPE_ENTERPRISE,
      group_name: options.group_name?options.group_name:member_info.user_name,
      gnb_color: options.gnb_color?options.gnb_color:'1c3048',
      group_open: options.group_open?options.group_open:0,
      group_join_way: options.group_join_way?options.group_join_way:0,
      member_open: options.member_open?options.member_open:0,
      member_name_used: options.member_name_used?options.member_name_used:0,
      search_keyword: options.search_keyword?JSON.stringify(options.search_keyword):null,
      group_explain: options.group_explain?options.group_explain:null,
      profile_image_path: options.profile_image_path?options.profile_image_path:null,
      channel_top_img_path: options.channel_top_img_path?options.channel_top_img_path:null,
      is_set_group_name: 1,
    }
    if (options.delete_channel_top_img || options.delete_channel_profile_img || modify_group_info.profile_image_path || modify_group_info.channel_top_img_path) {
      const group_model = this.getGroupModel(database);
      const group_info = await group_model.getGroupInfo(seq);
      if (options.delete_channel_top_img) {
        await Util.deleteFile(group_info.channel_top_img_path);
        modify_group_info.channel_top_img_path = '';
      }
      if (options.delete_channel_profile_img) {
        await Util.deleteFile(group_info.profile_image_path);
        modify_group_info.profile_image_path = '';
      }
      if (modify_group_info.channel_top_img_path) {
        if (group_info.channel_top_img_path) {
          await Util.deleteFile(group_info.channel_top_img_path);
        }
      }
      if (modify_group_info.profile_image_path) {
        if (group_info.profile_image_path) {
          await Util.deleteFile(group_info.profile_image_path);
        }
      }
    }
    return await this.updateGroupInfo(database, modify_group_info, seq)
  }

  updateGroupInfo = async (database, modify_group_info, seq) => {
    const resObj = {
      completed: true,
      group_seq: seq,
      group_info: {}
    }
    try {
      const group_model = this.getGroupModel(database)
      await group_model.updateGroup(modify_group_info, seq)
      resObj.group_info = await group_model.getGroupInfo(seq, null);
      resObj.group_info.group_image_url = await Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), JSON.parse(resObj.group_info.profile).image)
      resObj.group_info.profile_image_url = await Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), resObj.group_info.profile_image_path)
      resObj.group_info.channel_top_img_url = await Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), resObj.group_info.channel_top_img_path)
      return resObj;
    } catch (e) {
      log.error(this.log_prefix, '[updateGroupInfo]', e)
      throw new StdObject(-2, '그룹 정보를 변경할 수 없습니다.', 400)
    }
  }

  addGroupMember = async (database, group_info, member_info, grade, max_storage_size = 0) => {
    if (grade !== this.MEMBER_GRADE_OWNER && group_info.group_type === this.GROUP_TYPE_PERSONAL) {
      throw new StdObject(-1, '권한이 없습니다.', 400)
    }

    const group_member_model = this.getGroupMemberModel(database)
    return await group_member_model.createGroupMember(group_info, member_info, grade, max_storage_size)
  }

  getMemberGroupListOLD = async (database, member_seq, is_active_only = true) => {
    log.debug(this.log_prefix, '[getMemberGroupList]', member_seq, is_active_only)
    const status = is_active_only ? this.MEMBER_STATUS_ENABLE : null
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_list = await group_member_model.getMemberGroupListOLD(member_seq, status)
    for (let i = 0; i < group_member_list.length; i++) {
      const group_member_info = group_member_list[i]
      if (group_member_info.profile_image_path) {
        group_member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_member_info.profile_image_path)
      }
      if (JSON.parse(group_member_info.profile).image) {
        group_member_list[i].group_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), JSON.parse(group_member_info.profile).image)
        group_member_list[i].addKey('group_image_url')
      }
      if (group_member_info.channel_top_img_path) {
        if (group_member_info.channel_top_img_url !== null) {
          group_member_info.channel_top_img_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_member_info.channel_top_img_path)
        }
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

  getMemberGroupList = async (database, member_seq, is_active_only = true, filter = null, page = null) => {
    log.debug(this.log_prefix, '[getMemberGroupList]', member_seq, is_active_only)
    const status = is_active_only ? this.MEMBER_STATUS_ENABLE : null
    const group_member_model = this.getGroupMemberModel(database)
    const group_member_list = await group_member_model.getMemberGroupList(member_seq, status, null, filter, page)
    for (let i = 0; i < group_member_list.length; i++) {
      const group_member_info = group_member_list[i]
      if (group_member_info.profile_image_path) {
        group_member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_member_info.profile_image_path)
      }
      if (JSON.parse(group_member_info.profile).image) {
        group_member_list[i].group_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), JSON.parse(group_member_info.profile).image)
        group_member_list[i].addKey('group_image_url')
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
    const videos_count = request_body.video_count ? true : false
    const pause_member = request_body.get_pause_name ? true : false
    const delete_member = request_body.get_delete_name ? true : false
    const detail_search = request_body.search_detail ? request_body.search_detail : null
    const member_grade = request_body.member_grade ? request_body.member_grade : null
    const non_admin = request_body.non_admin ? request_body.non_admin : null

    const paging = {}
    paging.list_count = request_paging.list_count ? request_paging.list_count : 20
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = request_paging.no_paging ? request_paging.no_paging : 'y'

    log.debug(this.log_prefix, '[getGroupMemberList]', request_body, member_type, search_text, paging)

    const group_member_model = this.getGroupMemberModel(database)
    const group_member_list = await group_member_model.getGroupMemberList(group_seq, member_type, paging, search_text, request_order, videos_count, pause_member, delete_member, detail_search, member_grade, non_admin);
    for(let i = 0; i < group_member_list.data.length; i++) {
      if (group_member_list.data[i].profile_image_path) {
        group_member_list.data[i].profile_image_path = ServiceConfig.get('static_storage_prefix') + group_member_list.data[i].profile_image_path
      }
    }
    return group_member_list;
  }

  getGroupMemberCount = async (database, group_seq, is_active_only = true, in_status = null) => {
    const status = is_active_only ? this.MEMBER_STATUS_ENABLE : in_status
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
      if (JSON.parse(group_member_info.profile).image) {
        group_member_info.group_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), JSON.parse(group_member_info.profile).image)
        group_member_info.addKey('group_image_url')
      }
    }
    if (group_member_info.channel_top_img_path) {
      if (group_member_info.channel_top_img_url !== null) {
        group_member_info.channel_top_img_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_member_info.channel_top_img_path)
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
    return group_member_info.grade === this.MEMBER_GRADE_ADMIN || group_member_info.grade === this.MEMBER_GRADE_OWNER || group_member_info.grade === this.MEMBER_GRADE_MANAGER
  }

  isGroupManagerByMemberInfo = (group_member_info) => {
    return group_member_info.grade === this.MEMBER_GRADE_MANAGER
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
    group_info.addKey('profile_image_url')
    if (JSON.parse(group_info.profile).image) {
      group_info.group_image_url = ServiceConfig.get('static_storage_prefix') + JSON.parse(group_info.profile).image
    }
    group_info.profile_image_url = ServiceConfig.get('static_storage_prefix') + group_info.profile_image_path
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
        // if (!group_member_info.isEmpty() && group_member_info.status !== this.MEMBER_STATUS_DISABLE) {
        //   return
        // }
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
          btn_link_url: `${service_domain}/v2/invite/channel/${encrypt_invite_code}`
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
      if (group_invite_info.group_member_status === this.MEMBER_STATUS_DISABLE || group_invite_info.group_member_status === this.MEMBER_STATUS_DISABLE_NO_VIEW || group_invite_info.group_member_status === this.MEMBER_STATUS_NORMAL) {
        if (member_seq && group_invite_info.join_member_seq !== member_seq) {
          const output = new StdObject()
          output.error = 11
          output.message = '만료된 초대코드입니다.'
          throw output
        }
      } else {
        const output = new StdObject()
        if (member_seq) {
          if (group_invite_info.join_member_seq === member_seq) {
            throw this.getInviteMemberStatusError(group_seq, group_name, group_invite_info.group_member_status)
          } else {
            output.error = 11
            output.message = '만료된 초대코드입니다.'
          }
          output.httpStatusCode = 400
          throw output
        }
      }
    }
    if (group_invite_info.invite_status !== 'Y') {
      throw new StdObject(-3, '만료된 초대코드입니다.', 400)
    }
    if (group_invite_info.group_status !== this.GROUP_STATUS_ENABLE || group_invite_info.group_type === this.GROUP_TYPE_PERSONAL) {
      log.debug(this.log_prefix, '[getInviteGroupInfo]', 'check group status', group_invite_info.group_status, this.GROUP_STATUS_ENABLE, group_invite_info.group_type, this.GROUP_TYPE_PERSONAL)
      throw new StdObject(-4, '가입이 불가능한 채널입니다.', 400)
    }
    if (member_seq) {
      const group_member_info = await this.getGroupMemberInfo(database, group_seq, member_seq)
      log.debug(this.log_prefix, '[getInviteGroupInfo]', member_seq, group_member_info.toJSON())
      if (!group_member_info.isEmpty()) {
        if (group_invite_info.invite_seq !== group_member_info.group_member_seq) {
          await group_member_model.setInviteInfoMerge(group_invite_info, group_seq, member_seq)
          group_invite_info.invite_seq = group_member_info.group_member_seq;
        }
        if (group_member_info.group_member_status === this.MEMBER_STATUS_NORMAL || group_member_info.group_member_status === this.MEMBER_STATUS_DISABLE || group_member_info.group_member_status === this.MEMBER_STATUS_DISABLE_NO_VIEW) {
          // pass
        } else {
          throw this.getInviteMemberStatusError(group_seq, group_name, group_member_info.group_member_status)
        }
      }
    }

    return group_invite_info
  }

  getInviteMemberStatusError = (group_seq, group_name, member_status) => {
    const output = new StdObject()
    if (member_status === this.MEMBER_STATUS_ENABLE) {
      output.error = 1
      output.message = '이미 가입된 채널입니다.'
      output.add('group_seq', group_seq)
      throw output
    } else if (member_status === this.MEMBER_STATUS_PAUSE) {
      output.error = 2
      output.message = `'${group_name}'채널 사용이 일시중지 되었습니다.`
    } else if (member_status === this.MEMBER_STATUS_JOIN) {
      output.error = 4
      output.message = `'${group_name}'채널에 승인 대기중입니다.`
    } else {
      output.error = 3
      output.message = `'${group_name}'채널에서 탈퇴되었습니다.`
    }
    return output
  }

  joinGroup = async (database, invite_seq, member_info, invite_code) => {
    const member_seq = member_info.seq
    invite_code = `${invite_code}`.toUpperCase()
    const group_member_model = this.getGroupMemberModel(database)
    const group_invite_info = await this.getInviteGroupInfo(database, invite_code, invite_seq, member_seq, false, true)
    let change_grade = '1';

    await group_member_model.inviteConfirm(invite_seq, member_seq, group_invite_info.group_max_storage_size, change_grade)

    const group_model = this.getGroupModel(database);
    await group_model.group_member_count(group_invite_info.group_seq, Constants.UP);

    this.sendGroupJoinAlarm(group_invite_info.group_seq, member_info)

    return group_invite_info.group_seq
  }

  changeGradeAdmin = async (database, group_member_info, admin_member_info, group_member_seq, service_domain) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.changeMemberGrade(group_member_seq, this.MEMBER_GRADE_ADMIN)

    const title = `'${group_member_info.group_name}'채널의 SurgStory 관리자가 되었습니다.`
    const message_info = {
      title: '채널 관리자 권한 변경',
      message: title
    }
    this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info, 'enableGroupAdmin', null)

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

    const title = `'${group_member_info.group_name}'채널의 SurgStory 관리자 권한이 해제되었습니다.`
    const message_info = {
      title: '채널 관리자 권한 변경',
      message: title,
      notice_type: 'alert'
    }
    this.onGroupMemberStateChange(group_member_info.group_seq, group_member_seq, message_info, 'disableGroupAdmin', null)
  }

  sendEmail = (title, body, mail_to_list, method = '') => {
    (
      async () => {
        try {
          const send_mail_result = await new SendMail().sendMailHtml(mail_to_list, title, body)
          log.debug(this.log_prefix, '[sendEmail]', method, send_mail_result)
        } catch (error) {
          log.error(this.log_prefix, '[sendEmail]', method, title, mail_to_list, error)
        }
      }
    )()
  }

  deleteInviteMail = async (database, group_member_info, group_member_seq) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_member_model = this.getGroupMemberModel(database)
    await group_member_model.deleteGroupMemberInfo(group_member_info.group_seq, group_member_seq)
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
    if (group_info.profile_image_path) {
      group_info.profile_image_url = ServiceConfig.get('static_storage_prefix') + group_info.profile_image_path;
      group_info.addKey('profile_image_url')
    }
    if (group_info.channel_top_img_path) {
      group_info.channel_top_img_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_info.channel_top_img_path)
      group_info.json_keys.push('channel_top_img_url')
    }
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
      title: '채널이 변경되었습니다.',
      message: `'${group_info.group_name}'채널이 변경되었습니다.`
    }
    await this.onGroupStateChange(group_info.seq, sub_type, null, message_info)

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

  onGroupMemberStateChange = (group_seq, group_member_seq, message_info = null, type = 'groupMemberStateChange', action_type = 'groupSelect') => {
    (
      async () => {
        try {
          const group_member_model = this.getGroupMemberModel(DBMySQL)
          const member_seq = await group_member_model.getMemberSeqByGroupMemberSeq(group_member_seq)
          if (!member_seq) {
            return
          }
          const data = {
            type,
            action_type
          }
          const socket_data = {
            data
          }
          if (message_info) {
            message_info.type = 'pushNotice'
            socket_data.message_info = message_info
          }
          if (group_seq) {
            data.group_seq = group_seq
            await SocketManager.sendToFrontGroupOne(group_seq, member_seq, socket_data)
          } else {
            await SocketManager.sendToFrontOne(member_seq, socket_data)
          }
        } catch (error) {
          log.error(this.log_prefix, '[onGroupMemberStateChange]', group_seq, group_member_seq, message_info, type, action_type, error)
        }
      }
    )()
  }

  onGroupStateChange = async (group_seq, sub_type = null, action_type = null, message_info = null) => {
    const data = {
      type: 'groupStorageInfoChange',
      group_seq
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti(group_seq, data, message_info)
  }

  onGeneralGroupNotice = async (group_seq, type, action_type = null, sub_type = null, message_info = null, extra_data = null) => {
    const data = {
      type,
      group_seq,
      ...extra_data
    }
    if (sub_type) data.sub_type = sub_type
    if (action_type) data.action_type = action_type

    await this.sendToFrontMulti(group_seq, data, message_info)
  }

  sendToFrontMulti = async (group_seq, data, message_info) => {
    const socket_data = {
      data
    }
    if (message_info) {
      message_info.type = 'pushNotice'
      socket_data.message_info = message_info
    }
    await SocketManager.sendToFrontGroup(group_seq, socket_data)
  }

  getUserGroupInfo = async (database, member_seq) => {
    const group_info_model = this.getGroupModel(database)
    return await group_info_model.getMemberGroupInfoAll(member_seq)
  }

  getGroupListForBox = async (database, group_seq_list = null) => {
    const result_list = []
    const group_info_model = this.getGroupModel(database)
    const group_list = await group_info_model.getGroupListForBox(group_seq_list)
    for (let i = 0; i < group_list.length; i++) {
      const group_info = group_list[i]
      const member_info = {
        'seq': group_info.member_seq,
        'group_seq': group_info.group_seq
      }
      const treat_code = group_info.treatcode ? JSON.parse(group_info.treatcode) : null
      const token_result = await Auth.getTokenResult(null, member_info, Role.API, true)
      result_list.push({
        'user_name': group_info.group_type === this.GROUP_TYPE_PERSONAL ? group_info.user_name : `${group_info.group_name}`,
        'user_id': group_info.user_id,
        'user_token': token_result.get('token'),
        'course_name': treat_code && treat_code.length > 0 ? treat_code[0].text : ''
      })
    }
    return result_list
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

  getGroupInfoWithGroupCounts = async (database, group_seq) => {
    try {
      const group_model = this.getGroupModel(database)
      const result = await group_model.getGroupInfoWithGroupCounts(group_seq)
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
      throw new StdObject(-2, '채널명을 변경할 수 없습니다.', 400)
    }
  }

  isDuplicateGroupName = async (database, group_name) => {
    const group_model = this.getGroupModel(database)
    return await group_model.isDuplicateGroupName(group_name)
  }

  getOpenGroupList = async (member_seq, request_query) => {
    let search = null
    if (request_query) {
      search = request_query.search ? request_query.search : null
    }
    const group_model = this.getGroupModel()
    const query_list = await group_model.getOpenGroupList(member_seq, search)
    const result_list = []
    if (query_list) {
      for (let i = 0; i < query_list.length; i++) {
        const result_json = new JsonWrapper(query_list[i]).toJSON()
        if (result_json.profile) {
          result_json.profile = JSON.parse(result_json.profile)
        }
        if (result_json.profile_image_path) {
          result_json.profile_image_path = ServiceConfig.get('static_storage_prefix') + result_json.profile_image_path
        }

        result_list.push(result_json)
      }
    }
    return result_list
  }

  requestJoinGroup = async (database, group_seq, member_info, params) => {
    const group_model = this.getGroupModel()
    const group_info = await group_model.getGroupInfo(group_seq)
    const grade = '1';
    const group_member_model = this.getGroupMemberModel()
    const group_member_info = await group_member_model.getGroupMemberInfo(group_seq, member_info.seq);
    const group_join_member_state = group_info.group_join_way === 1 ? this.MEMBER_STATUS_JOIN : 'Y';
    const is_join_answer = params.quest;

    const result_info = {
      error: 0,
      msg: '',
    };
    if (group_member_info) {
      switch (group_member_info.status) {
        case 'B':
          result_info.error = 9;
          result_info.msg = '탈퇴한 이력이 있어 가입하실 수 없습니다. 채널 관리자에게 문의해주세요.';
          break;
        case 'J':
          result_info.error = 8;
          result_info.msg = '이미 가입신청한 상태입니다.';
          break;
        case 'C':
        case 'N':
        case 'D':
          const params = {
            grade: grade,
            status: group_join_member_state,
            answer: is_join_answer,
            ban_hide: 'N',
          }
          const update_chk = await group_member_model.updateGroupMemberJoin(group_seq, null, group_member_info.seq, params)
          if (!update_chk) {
            result_info.error = 4;
            result_info.msg = '필수 정보가 누락되었습니다.'
          } else {
            if (group_info.group_join_way !== 1) {
              await group_model.group_member_count(group_seq, Constants.UP)
              this.sendGroupJoinAlarm(group_seq, member_info)
            } else {
              this.sendGroupJoinRequestAlarm(group_seq, member_info)
            }
          }
          break;
        case 'P':
          result_info.error = 7;
          result_info.msg = '활동 정지된 계정입니다.';
          break;
        case 'Y':
          result_info.error = 6;
          result_info.msg = '이미 가입한 채널입니다.';
          break;
        default:
          result_info.error = 5;
          result_info.msg = '알수 없는 오류.';
          break;
      }
    } else {
      const insert_chk = await group_member_model.createGroupMember(group_info, member_info, grade, null, group_join_member_state, is_join_answer)
      if (!insert_chk) {
        result_info.error = 3;
        result_info.msg = '회원가입 신청에 실패하였습니다.'
      } else {
        if (group_info.group_join_way !== 1) {
          await group_model.group_member_count(group_seq, Constants.UP)
          this.sendGroupJoinAlarm(group_seq, member_info)
        } else {
          this.sendGroupJoinRequestAlarm(group_seq, member_info)
        }
      }
    }
    return result_info;
  }

  sendGroupJoinAlarm = (group_seq, member_info) => {
    (
      async (group_seq, member_info) => {
        try {
          group_seq = Util.parseInt(group_seq, 0)
          const group_info = await this.getGroupInfo(null, group_seq)
          const alarm_data = {
            page: 'group_admin',
            query: {
              menu: 'member_manage',
              tab: 'active'
            },
            on_click: 'move_page'
          }
          const alarm_message = `'{name}'님이 '${group_info.group_name}'채널에 가입하였습니다.`
          const name = group_info.member_name_used ? member_info.user_name : member_info.user_nickname
          const socket_message = {
            title: '신규 회원 가입',
            message: `'${name}'님이 '${group_info.group_name}'채널에 가입하였습니다.<br/>확인하려면 클릭하세요.`
          }
          const socket_data = {
            member_seq: member_info.seq
          }
          GroupAlarmService.createGroupAdminAlarm(group_seq, 'join', alarm_message, member_info, alarm_data, socket_message, socket_data)
        } catch (error) {
          log.error(this.log_prefix, '[sendGroupJoinAlarm]', group_seq, member_info.user_id, error)
        }
      }
    )(group_seq, member_info)
  }

  sendGroupJoinRequestAlarm = (group_seq, member_info) => {
    (
      async (group_seq, member_info) => {
        try {
          group_seq = Util.parseInt(group_seq, 0)
          const group_info = await this.getGroupInfo(null, group_seq)
          const alarm_data = {
            page: 'group_admin',
            query: {
              menu: 'member_manage',
              tab: 'join'
            },
            on_click: 'move_page'
          }
          const alarm_message = `'{name}'님이 '${group_info.group_name}'채널에 가입신청을 하였습니다.`
          const name = group_info.member_name_used ? member_info.user_name : member_info.user_nickname
          const socket_message = {
            title: '신규 회원 가입 신청',
            message: `'${name}'님이 '${group_info.group_name}'채널에 가입신청을 하였습니다.<br/>확인하려면 클릭하세요.`
          }
          const socket_data = {
            member_seq: member_info.seq
          }
          GroupAlarmService.createGroupAdminAlarm(group_seq, 'join_request', alarm_message, member_info, alarm_data, socket_message, socket_data)
        } catch (error) {
          log.error(this.log_prefix, '[sendGroupJoinRequestAlarm]', group_seq, member_info.user_id, error)
        }
      }
    )(group_seq, member_info)
  }

  confirmJoinGroup = async (group_member_info, group_member_seq) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_member_model = this.getGroupMemberModel()
    return await group_member_model.joinConfirm(group_member_seq)
  }

  deleteJoinGroup = async (group_member_info, group_seq, group_member_seq) => {
    const is_group_admin = this.isGroupAdminByMemberInfo(group_member_info)
    if (!is_group_admin) {
      throw new StdObject(-1, '권한이 없습니다.', 403)
    }
    const group_member_model = this.getGroupMemberModel()
    return await group_member_model.deleteGroupMemberInfo(group_seq, group_member_seq)
  }

  updateJoinManage = async (database, group_seq, params) => {
    const filter = {
      seq: group_seq
    }
    const group_model = this.getGroupModel(database)
    return await group_model.updateJoinManage(filter, params);
  }

  SyncGroupGrade = async (database) => {
    const group_model = this.getGroupModel(database)
    const group_infos = await group_model.getGroupInfoAllByGroup()

    for (let cnt = 0; cnt < Object.keys(group_infos).length; cnt++) {
      await this.createDefaultGroupGrade(database, group_infos[cnt].seq)
    }
  }

  createDefaultGroupGrade = async (database, group_seq) => {
    const grade_model = this.getGroupGradeModel(database)
    const grade_list = [
      // { group_seq, grade: '0', grade_text: '비회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { group_seq, grade: '1', grade_text: '기본회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { group_seq, grade: '2', grade_text: '준회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { group_seq, grade: '3', grade_text: '정회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { group_seq, grade: '4', grade_text: '평생회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { group_seq, grade: '5', grade_text: '명예회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { group_seq, grade: '6', grade_text: '매니저', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { group_seq, grade: 'O', grade_text: '관리자', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
    ];

    for (let cnt = 0; cnt < grade_list.length; cnt++) {
      await grade_model.insertGroupGrade(grade_list[cnt])
    }
  }

  getGradeManageList = async (database, group_seq) => {
    const grade_model = this.getGroupGradeModel(database)
    return await grade_model.getGroupManageGradeListWithGroupSeq(group_seq)
  }

  getGradeList = async (database, group_seq) => {
    const grade_model = this.getGroupGradeModel(database)
    return await grade_model.getGroupGradeListWithGroupSeq(group_seq)
  }

  updateGradeList = async (database, group_seq, grade_list) => {
    const grade_model = this.getGroupGradeModel(database)
    const filter = {
      group_seq,
    }
    for (let cnt = 0; cnt < grade_list.length; cnt++) {
      filter.grade = grade_list[cnt].grade
      delete grade_list[cnt].seq
      delete grade_list[cnt].reg_date
      grade_list[cnt].modify_date = database.raw('NOW()')
      await grade_model.updateGroupGrade(filter, grade_list[cnt])
    }
  }

  groupJoinList = async (database, group_seq, join_info) => {
    const group_member_model = this.getGroupMemberModel(database);
    const group_model = this.getGroupModel(database);
    const status = join_info.join_type === 'join' ? 'Y' : 'C';
    if (status === 'Y') {
      await group_model.group_member_count(group_seq, Constants.UP);
    }
    return await group_member_model.groupJoinList(group_seq, join_info.join_list, status);
  }

  setMemberStatePause = async (database, group_seq, request_body, group_member_info, domain) => {
    const group_member_seq_list = request_body.pause_list
    if (!group_member_seq_list || !group_member_seq_list.length) {
      throw new StdObject(-1, '잘못된 접근입니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database)
    const update_result = await group_member_model.updatePauseList(group_seq, group_member_seq_list, request_body, 'P')
    this.sendMemberPauseMessage(group_member_info, group_member_seq_list, domain)
    return update_result
  }
  sendMemberPauseMessage = (admin_member_info, group_member_seq_list, service_domain) => {
    (
      async () => {
        const title = `SurgStory ${admin_member_info.group_name}채널이 사용 일시중단 되었습니다.`
        const message_info = {
          title: '채널 사용 불가',
          message: title,
          notice_type: 'alert'
        }
        const name = admin_member_info.member_name_used ? admin_member_info.user_name : admin_member_info.user_nickname
        const template_data = {
          service_domain,
          group_name: admin_member_info.group_name,
          admin_name: name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.pauseGroupMember(template_data)
        await this.sendMessageBySeqList(admin_member_info.group_seq, group_member_seq_list, title, message_info, body, 'sendMemberPauseMessage', 'disableUseGroup')
      }
    )()
  }

  unSetMemberStatePause = async (database, group_seq, request_body, admin_member_info, domain) => {
    const group_member_seq_list = request_body.pause_list
    if (!group_member_seq_list || !group_member_seq_list.length) {
      throw new StdObject(-1, '잘못된 접근입니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database);
    const update_result = await group_member_model.updatePauseList(group_seq, group_member_seq_list, request_body, 'Y')

    this.sendMemberUnPauseMessage(admin_member_info, group_member_seq_list, domain)

    return update_result
  }
  sendMemberUnPauseMessage = (admin_member_info, group_member_seq_list, service_domain) => {
    (
      async () => {
        const title = `SurgStory ${admin_member_info.group_name}채널이 사용 일시중단 해제 되었습니다.`
        const message_info = {
          title: title,
          message: '채널을 선택하려면 클릭하세요.'
        }
        const name = admin_member_info.member_name_used ? admin_member_info.user_name : admin_member_info.user_nickname
        const template_data = {
          service_domain,
          group_name: admin_member_info.group_name,
          admin_name: name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.unPauseGroupMember(template_data)
        await this.sendMessageBySeqList(admin_member_info.group_seq, group_member_seq_list, title, message_info, body, 'sendMemberUnPauseMessage')
      }
    )()
  }

  setGroupMemberStateBan = async (database, group_seq, request_body, admin_member_info, service_domain) => {
    const group_member_seq_list = request_body.ban_list
    if (!group_member_seq_list || !group_member_seq_list.length) {
      throw new StdObject(-1, '잘못된 접근입니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database);
    let status = 'D';
    if (request_body.join_ban) {
      status = 'B';
    }
    const update_result = await group_member_model.updateBanList(group_seq, group_member_seq_list, request_body, status)
    await this.setGroupMemberCount(DBMySQL, group_seq, Constants.DOWN, group_member_seq_list.length);
    this.sendMemberBanMessage(admin_member_info, group_member_seq_list, service_domain)

    return update_result
  }
  sendMemberBanMessage = (admin_member_info, group_member_seq_list, service_domain) => {
    (
      async () => {
        const title = `${admin_member_info.group_name}채널의 SurgStory 팀원에서 제외되었습니다.`
        const message_info = {
          title: '채널 사용 불가',
          message: title,
          notice_type: 'alert'
        }
        const name = admin_member_info.member_name_used ? admin_member_info.user_name : admin_member_info.user_nickname
        const template_data = {
          service_domain,
          group_name: admin_member_info.group_name,
          admin_name: name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.deleteGroupMember(template_data)
        await this.sendMessageBySeqList(admin_member_info.group_seq, group_member_seq_list, title, message_info, body, 'sendMemberBanMessage', 'disableUseGroup')
      }
    )()
  }

  unSetGroupMemberStateBan = async (database, group_seq, request_body, admin_member_info, service_domain) => {
    const group_member_seq_list = request_body.ban_list
    if (!group_member_seq_list || !group_member_seq_list.length) {
      throw new StdObject(-1, '잘못된 접근입니다.', 400)
    }
    const group_member_model = this.getGroupMemberModel(database);
    const group_model = this.getGroupModel(database);
    let change_grade = '1';
    const update_result = await group_member_model.updateBanList(group_seq, group_member_seq_list, request_body, 'Y', change_grade)
    await group_model.group_member_count(group_seq, Constants.UP, group_member_seq_list.length);
    this.sendMemberUnBanMessage(admin_member_info, group_member_seq_list, service_domain)
    return update_result
  }
  sendMemberUnBanMessage = (admin_member_info, group_member_seq_list, service_domain) => {
    (
      async () => {
        const title = `SurgStory ${admin_member_info.group_name}채널이 팀원으로 복원되었습니다.`
        const message_info = {
          title: title,
          message: '채널을 선택하려면 클릭하세요.'
        }
        const name = admin_member_info.member_name_used ? admin_member_info.user_name : admin_member_info.user_nickname
        const template_data = {
          service_domain,
          group_name: admin_member_info.group_name,
          admin_name: name,
          btn_link_url: `${service_domain}/`
        }
        const body = GroupMailTemplate.unDeleteGroupMember(template_data)
        await this.sendMessageBySeqList(admin_member_info.group_seq, group_member_seq_list, title, message_info, body, 'sendMemberUnBanMessage')
      }
    )()
  }

  sendMessageBySeqList = async (group_seq, group_member_seq_list, title, socket_message_info = null, email_body = null, method = null, socket_data_type = null) => {
    const email_map = {}
    const email_to_list = []
    for (let i = 0; i < group_member_seq_list.length; i++) {
      const group_member_seq = group_member_seq_list[i]
      if (socket_message_info) {
        this.onGroupMemberStateChange(group_seq, group_member_seq, socket_message_info, socket_data_type)
      }
      if (email_body) {
        const target_member_info = await this.getGroupMemberInfoBySeq(DBMySQL, group_member_seq)
        if (target_member_info && target_member_info.invite_email) {
          if (email_map[target_member_info.invite_email]) continue
          email_to_list.push(target_member_info.invite_email)
          email_map[target_member_info.invite_email] = true
        }
      }
    }
    if (email_to_list.length) {
      this.sendEmail(title, email_body, email_to_list, method)
    }
  }

  changeGradeMemberList = async (database, group_seq, change_member_info, group_member_info) => {
    const group_member_model = this.getGroupMemberModel(database);
    for (let i = 0; i < change_member_info.change_list.length; i++) {
      const target_member_info = await group_member_model.getGroupMemberInfoBySeq(change_member_info.change_list[i]);
      if (target_member_info) {
        if (target_member_info.grade === '6') {
          await this.changeGradeNormal(database, group_member_info, change_member_info.change_list[i]);
        }
      }
    }
    return await group_member_model.updateGradeList(group_seq, change_member_info)
  }

  deleteGroupMemberContents = async (database, group_seq, target_info, token_info) => {
    const group_member_model = this.getGroupMemberModel(database);
    const operation_model = new OperationModel(database);
    for (let i = 0; i < target_info.target_list.length; i ++) {
      const member_seq = await group_member_model.getMemberSeqByGroupMemberSeq(target_info.target_list[i]);
      const operation_list = await OperationService.getAllOperationGroupMemberList(database, group_seq, member_seq);
      for (let j = 0; j < operation_list.length; j++) {
        const operation_data = await OperationDataService.getOperationDataByOperationSeq(database, operation_list[j].seq);
        const params = {};
        params.limit = 999;
        params.start = 0;
        const operation_comment_list = await OperationCommentService.getCommentList(database, operation_data.seq, params)
        for (let k = 0; k < operation_comment_list.length; k++) {
          const del_count = await OperationCommentService.deleteAllComment(database, group_seq, operation_comment_list[k].member_seq);
          this.onChangeGroupMemberContentCount(group_seq, operation_comment_list[k].member_seq, 'vid_comment', Constants.DOWN, del_count);
        }
        const clip_list = await OperationClipService.findByOperationSeq(operation_list[j].seq);
        for (let k = 0; k < clip_list.length; k++) {
          const target_group_member_info = await group_member_model.getGroupMemberInfo(clip_list[k].group_seq, clip_list[k].member_seq);
          const clip_res_member_info = { group_member_seq: target_group_member_info.seq };
          const clip_params = {};
          clip_params.clip_count = clip_list.length - 1;
          await OperationClipService.deleteById(clip_list[k]._id.toString(), operation_data, clip_params, clip_res_member_info);
        }
        await OperationService.deleteOperation(database, token_info, operation_list[j].seq);
        await operation_model.deleteOperation(operation_list[j].seq);
      }
      await OperationService.setAllOperationClipDeleteByGroupSeqAndMemberSeq(database, group_seq, member_seq);
      await OperationCommentService.deleteAllComment(database, group_seq, member_seq);
      await GroupBoardDataService.allDeleteCommentByGrouypSeqMemberSeq(database, group_seq, member_seq)
    }
    return await group_member_model.updateMemberContentsInfo(group_seq, target_info)
  }

  getMemberGroupAllCount = async (database, member_seq, option) => {
    const group_member_model = this.getGroupMemberModel(database)
    return group_member_model.getMemberGroupAllCount(member_seq, option)
  }
  GroupMemberCountSync = async (database) => {
    const group_model = this.getGroupModel(database)
    await group_model.GroupMemberCountSync()
  }
  GroupMemberStatusUpdate = async (database, group_seq, mem_info) => {
    const group_member_model = this.getGroupMemberModel(database);
    return await group_member_model.updateMemberStatus(group_seq, mem_info)
  }
  getGroupMemberInfoDetail = async (database, group_seq, group_member_seq) => {
    const group_member_model = this.getGroupMemberModel(database);
    const group_member_info = await group_member_model.getGroupMemberDetailQuery(group_seq, group_member_seq);
    group_member_info.member_profile_url = await Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), group_member_info.profile_image_path)
    return group_member_info;
  }
  getSummaryCommentList = async (database, group_seq, member_seq, req) => {
    const group_model = this.getGroupModel(database)

    const request_body = req.query ? req.query : {}
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    const paging = {};
    paging.list_count = request_paging.list_count ? request_paging.list_count : 10
    paging.cur_page = request_paging.cur_page ? request_paging.cur_page : 1
    paging.page_count = request_paging.page_count ? request_paging.page_count : 10
    paging.no_paging = 'N'
    const group_summary_comment_list = await group_model.GroupSummaryCommentListByGroupSeqMemberSeq(group_seq, member_seq, paging)
    log.debug(this.log_prefix, '[getSummaryCommentList]', group_summary_comment_list);
    _.forEach(group_summary_comment_list.data, async (item) => {
      item.content = striptags(item.content)
    })
    return group_summary_comment_list;
  }
  setGroupMemberCount = async (databases, group_seq, type, count = 1) => {
    const group_model = this.getGroupModel(databases);
    if (type === Constants.UP) {
      await group_model.group_member_count(group_seq, Constants.UP, count);
    } else if (type === Constants.DOWN) {
      await group_model.group_member_count(group_seq, Constants.DOWN, count);
    }
  }
  setMemberPauseReset = async () => {
    const group_member_model = this.getGroupMemberModel()
    return await group_member_model.setPauseMemberReset()
  }
  setGroupClosure = async (databases, group_seq) => {
    const group_model = this.getGroupModel(databases);
    if (group_seq) {
      return await group_model.set_group_closure(group_seq);
    }
    return false;
  }

  async getGroupStorageStatus (group_seq) {
    const status = {
      max_storage_size: 0,
      use_storage_size: 0
    }
    const group_info = await this.getGroupInfo(DBMySQL, group_seq)
    if (group_info) {
      status.max_storage_size = Util.parseInt(group_info.storage_size)
      status.use_storage_size = Util.parseInt(group_info.used_storage_size)
    }
    return status
  }

  onChangeGroupMemberContentCount = (group_seq, member_seq, update_column, type, count = 1) => {
    (
      async (group_seq, member_seq, update_column, type, count) => {
        try {
          log.debug(this.log_prefix, '[onChangeGroupMemberContentCount]', `{ group_seq: ${group_seq}, member_seq: ${member_seq}, update_column: ${update_column}, type: ${type}, count: ${count} }`)
          const group_member_model = this.getGroupMemberModel()
          await group_member_model.updateGroupMemberContentCount(group_seq, member_seq, update_column, type, count)
        } catch (error) {
          log.error(this.log_prefix, '[onChangeGroupMemberContentCount]', `{ group_seq: ${group_seq}, member_seq: ${member_seq}, update_column: ${update_column}, type: ${type}, count: ${count} }`, error)
        }
      }
    )(group_seq, member_seq, update_column, type, count)
  }
}

const group_service = new GroupServiceClass()

export default group_service
