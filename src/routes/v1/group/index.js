import _ from "lodash";
import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Util from '../../../utils/baseutil'
import log from '../../../libs/logger'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import baseutil from "../../../utils/baseutil";
import GroupService from '../../../service/group/GroupService'
import OperationFolderService from "../../../service/operation/OperationFolderService";
import GroupBoardListService from "../../../service/board/GroupBoardListService";
import OperationDataService from "../../../service/operation/OperationDataService";
import GroupBoardDataService from "../../../service/board/GroupBoardDataService";
import OperationCommentService from "../../../service/operation/OperationCommentService";

const routes = Router()

const checkGroupAuth = async (database, req, check_group_auth = true, throw_exception = false) => {
  return await GroupService.checkGroupAuth(database, req, false, check_group_auth, throw_exception)
}

const getGroupMemberSeq = (request) => Util.parseInt(request.params.group_member_seq, 0)
const getMemberSeq = (request) => Util.parseInt(request.params.member_seq, 0)

routes.get('/me', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false)
  const member_group_list = await GroupService.getMemberGroupListOLD(DBMySQL, member_seq)

  const output = new StdObject()
  output.add('member_group_list', member_group_list)
  res.json(output)
}))

routes.get('/:group_seq(\\d+)/me', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info } = await checkGroupAuth(DBMySQL, req)

  const output = new StdObject()
  output.add('group_info', group_member_info)
  res.json(output)
}))

routes.get('/:group_seq(\\d+)/auth', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { is_active_group_member } = await checkGroupAuth(DBMySQL, req, true, false)

  const output = new StdObject()
  output.add('is_active_group_member', is_active_group_member)
  res.json(output)
}))

routes.get('/:group_seq(\\d+)/summary', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await checkGroupAuth(DBMySQL, req, false)
  const group_summary = await GroupService.getGroupSummary(DBMySQL, group_seq)
  const output = new StdObject()
  output.adds(group_summary)
  res.json(output)
}))

routes.post('/:group_seq(\\d+)/members', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_list = await GroupService.getGroupMemberList(DBMySQL, group_seq, req)

  const output = new StdObject()
  output.adds(group_member_list)
  res.json(output)
}))

routes.get('/:group_seq(\\d+)/member_count/:in_status', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await checkGroupAuth(DBMySQL, req)
  const in_status = req.params.in_status
  const member_count = await GroupService.getGroupMemberCount(DBMySQL, group_seq, false, in_status)

  const output = new StdObject()
  output.add('member_count', member_count)
  res.json(output)
}))

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/delete', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info, member_info, token_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  const is_delete_operation = req.body.is_delete_operation === true
  await GroupService.deleteMember(DBMySQL, group_member_info, member_info, group_member_seq, token_info.getServiceDomain(), is_delete_operation)

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/delete', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info, member_info, token_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.unDeleteMember(DBMySQL, group_member_info, member_info, group_member_seq, token_info.getServiceDomain())

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/admin', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info, member_info, token_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.changeGradeAdmin(DBMySQL, group_member_info, member_info, group_member_seq, token_info.getServiceDomain())

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/admin', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.changeGradeNormal(DBMySQL, group_member_info, group_member_seq)

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/pause', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info, member_info, token_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.pauseMember(DBMySQL, group_member_info, member_info, group_member_seq, token_info.getServiceDomain())

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/pause', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info, member_info, token_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.unPauseMember(DBMySQL, group_member_info, member_info, group_member_seq, token_info.getServiceDomain())

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.post('/:group_seq(\\d+)/invite', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info, member_info, token_info } = await checkGroupAuth(DBMySQL, req)
  log.d(req, group_member_info.toJSON(), member_info.toJSON(), req.body, token_info.getServiceDomain())
  await GroupService.inviteGroupMembers(DBMySQL, group_member_info, member_info, req.body, token_info.getServiceDomain())

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/invite', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.deleteInviteMail(DBMySQL, group_member_info, group_member_seq)

  const output = new StdObject()
  output.add('result', true)
  res.json(output)
}))

routes.get('/invite/:invite_code', Auth.isAuthenticated(), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const member_seq = token_info ? token_info.getId() : null
  const invite_code = req.params.invite_code
  log.d(req, token_info, member_seq, invite_code)
  const group_invite_info = await GroupService.getInviteGroupInfo(DBMySQL, invite_code, null, member_seq, true)

  const output = new StdObject()
  output.add('group_invite_info', group_invite_info)
  res.json(output)
}))

routes.post('/join/:invite_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_info } = await checkGroupAuth(DBMySQL, req, false)
  const invite_seq = Util.parseInt(req.params.invite_seq, 0)
  const invite_code = req.body.invite_code
  const group_seq = await GroupService.joinGroup(DBMySQL, invite_seq, member_info, invite_code)

  const output = new StdObject()
  output.add('group_seq', group_seq)
  res.json(output)
}))

routes.put('/:group_seq(\\d+)/name/:group_name', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq, is_group_admin } = await checkGroupAuth(DBMySQL, req)
  if (!is_group_admin) {
    throw new StdObject(-1, '권한이 없습니다.', 403)
  }
  const group_name = req.params.group_name
  const result = await GroupService.changeGroupName(group_seq, group_name)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.put('/:group_seq(\\d+)/files/profile_image', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_member_info, is_group_admin } = await checkGroupAuth(DBMySQL, req)
  if (!is_group_admin) {
    throw new StdObject(-1, '권한이 없습니다.', 403)
  }
  const output = await GroupService.changeGroupProfileImage(DBMySQL, group_member_info, req, res)
  res.json(output)
}))

routes.put('/create_group', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const options = {
    storage_size: 13194139533312,
    pay_code: 'f_12TB',
    start_date: (Util.getToDate()).concat(' 00:00:00'),
    expire_date: (Util.getDateYearAdd(Util.getToDate(), 1)).concat(' 23:59:59'),
  }
  const output = new StdObject()
  output.add('result', await GroupService.createEnterpriseGroup(DBMySQL, member_info, options))
  res.json(output)
}))

routes.post('/create_group_new', Util.common_path_upload.fields([{ name: 'group_profile_img' }]), Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const params = JSON.parse(req.body.params)
  _.forEach(req.files, (value) => {
    if (value[0].fieldname === 'group_profile_img') {
      params.profile_image_path = '/common/' + value[0].filename
    }
  })
  const { member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, false, true)
  const options = {
    storage_size: 13194139533312,
    pay_code: 'f_12TB',
    start_date: (Util.getToDate()).concat(' 00:00:00'),
    expire_date: (Util.getDateYearAdd(Util.getToDate(), 1)).concat(' 23:59:59'),
    group_name: params.group_name,
    group_open: params.group_open,
    is_channel: params.group_open,
    group_join_way: params.group_join_way,
    member_open: params.member_open,
    member_name_used: params.member_name_used,
    search_keyword: params.search_keyword,
    group_explain: params.group_explain,
    profile_image_path: params.profile_image_path,
  }
  const output = new StdObject()
  output.add('result', await GroupService.createEnterpriseGroup(DBMySQL, member_info, options))
  res.json(output)
}))

routes.post('/update_group', baseutil.common_path_upload.fields([{ name: 'group_profile_img' }]), Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const params = JSON.parse(req.body.params)
  _.forEach(req.files, (value) => {
    if (value[0].fieldname === 'group_profile_img') {
      params.profile_image_path = '/common/' + value[0].filename
    }
  })
  const { member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const options = {
    group_name: params.group_name,
    group_open: params.group_open,
    group_join_way: params.group_join_way,
    member_open: params.member_open,
    member_name_used: params.member_name_used,
    search_keyword: params.search_keyword,
    group_explain: params.group_explain,
    profile_image_path: params.profile_image_path,
  }
  const output = new StdObject()
  const rs_gorup_info = await GroupService.updateEnterpriseGroup(DBMySQL, member_info, options, params.seq);
  output.add('result', rs_gorup_info);
  res.json(output)
}))

routes.post('/verify/group_name', Wrap(async (req, res) => {
  req.accepts('application/json')
  const group_name = req.body.group_name
  const is_duplicate = await GroupService.isDuplicateGroupName(DBMySQL, group_name)

  const output = new StdObject()
  output.add('is_verify', !is_duplicate)

  res.json(output)
}))

routes.get('/open', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false, true)
  const result = await GroupService.getOpenGroupList(member_seq, req.query)

  const output = new StdObject()
  output.add('open_group_list', result)
  res.json(output)
}))

routes.post('/open/:group_seq(\\d+)/join', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, member_info } = await checkGroupAuth(DBMySQL, req, false, true)
  const result = await GroupService.requestJoinGroup(DBMySQL, group_seq, member_info, req.body)
  const output = new StdObject()
  output.add('res', result)
  res.json(output)
}))

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/join/confirm', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_member_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  const result = await GroupService.confirmJoinGroup(group_member_info, group_member_seq)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/join', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, group_member_info } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  const result = await GroupService.deleteJoinGroup(group_member_info, group_seq, group_member_seq)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.get('/getjoinmanage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const output = new StdObject()

  const join_setting = await GroupService.getGroupInfo(DBMySQL, group_seq)
  output.add('result', join_setting)

  res.json(output)
}))

routes.put('/updatejoinmanage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const params = {
    group_message: req.body.join_message,
    group_question: JSON.stringify(req.body.question_list) === 'null' ? null : JSON.stringify(req.body.question_list)
  }
  const output = new StdObject()

  const result = await GroupService.updateJoinManage(DBMySQL, group_seq, params)
  output.add('result', result)

  res.json(output)
}))

routes.get('/getgrademanagelist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const output = new StdObject()

  let grade_list = await GroupService.getGradeManageList(DBMySQL, group_seq)
  if (!grade_list) {
    grade_list = [
      // { grade: '0', grade_text: '비회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '1', grade_text: '기본회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '2', grade_text: '준회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '3', grade_text: '정회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '4', grade_text: '평생회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '5', grade_text: '명예회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '6', grade_text: '매니저', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: 'O', grade_text: '관리자', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
    ];
  }
  output.add('result', grade_list)

  res.json(output)
}))

routes.get('/getgradelist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const output = new StdObject()

  let grade_list = await GroupService.getGradeList(DBMySQL, group_seq)
  if (!grade_list) {
    grade_list = [
      // { grade: '0', grade_text: '비회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '1', grade_text: '기본회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '2', grade_text: '준회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '3', grade_text: '정회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '4', grade_text: '평생회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '5', grade_text: '명예회원', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: '6', grade_text: '매니저', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
      { grade: 'O', grade_text: '관리자', grade_explain: '', auto_grade: 0, video_upload_cnt: 0, annotation_cnt: 0, comment_cnt: 0, used: 1 },
    ];
  }
  output.add('result', grade_list)

  res.json(output)
}))

routes.post('/updategradelist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const grade_list = req.body.grade_list
  const output = new StdObject()

  const result = await GroupService.updateGradeList(DBMySQL, group_seq, grade_list)
  output.add('result', result)

  res.json(output)
}))

routes.post('/pausegroupmember', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq, group_member_info, member_info, token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const pause_list = req.body.pause_list;
  for (let i = 0; i < pause_list.pause_list.length; i++) {
    await GroupService.pauseMember(DBMySQL, group_member_info, member_info, pause_list.pause_list[i], token_info.getServiceDomain())
  }
  const output = new StdObject()

  const result = await GroupService.updatePauseList(DBMySQL, group_seq, pause_list)
  output.add('result', result)

  res.json(output)
}))

routes.post('/nonpausegroupmember', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const pause_list = req.body.pause_list;
  const output = new StdObject()

  const result = await GroupService.nonupdatePauseList(DBMySQL, group_seq, pause_list)
  output.add('result', result)

  res.json(output)
}))

routes.post('/joingrouplist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const join_info = req.body.join_info;
  const output = new StdObject()

  const result = await GroupService.groupJoinList(DBMySQL, group_seq, join_info)
  output.add('result', result)

  res.json(output)
}))

routes.post('/bangroupmember', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq, group_member_info, member_info, token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const ban_info = req.body.ban_info;
  const message = '탈퇴 되었습니다.';
  for (let i = 0; i < ban_info.ban_list.length; i++) {
    await GroupService.pauseMember(DBMySQL, group_member_info, member_info, ban_info.ban_list[i], token_info.getServiceDomain(), message)
  }
  const output = new StdObject()
  const result = await GroupService.updateBanList(DBMySQL, group_seq, ban_info)
  output.add('result', result)

  res.json(output)
}))

routes.post('/nonbangroupmember', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const ban_info = req.body.ban_info;
  const output = new StdObject()

  const result = await GroupService.nonupdateBanList(DBMySQL, group_seq, ban_info)
  output.add('result', result)

  res.json(output)
}))

routes.post('/chagegrademember', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq, group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const change_member_info = req.body.change_member_info;
  const output = new StdObject()

  const result = await GroupService.changeGradeMemberList(DBMySQL, group_seq, change_member_info, group_member_info)
  output.add('result', result)

  res.json(output)
}))

routes.post('/setdelgroupmemcontents', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { token_info, group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const target_info = req.body.target_info
  const output = new StdObject()

  const result = await GroupService.deleteGroupMemberContents(DBMySQL, group_seq, target_info, token_info)
  output.add('result', result)

  res.json(output)
}))

routes.post('/savefolderandboard/:group_seq(\\d+)/:member_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_seq = req.params.group_seq
  const member_seq = req.params.member_seq
  const folder_list = req.body.folder_list
  const board_list = req.body.board_list

  if (folder_list.length > 0) {
    await DBMySQL.transaction(async (transaction) => {
      for (let cnt = 0; cnt < folder_list.length; cnt++) {
        if (folder_list[cnt].change_bool) {
          if (folder_list[cnt].seq) {
            const folder_info = {
              folder_info: folder_list[cnt],
            }
            await OperationFolderService.updateOperationFolder(transaction, folder_list[cnt].seq, folder_info)
            await OperationFolderService.updateParentFolderAccessType(transaction, folder_list[cnt].seq, folder_list[cnt].access_type)
          } else {
            const folder_info = {
              folder_info: folder_list[cnt],
            }
            await OperationFolderService.createOperationFolder(transaction, folder_info, group_seq, member_seq)
          }
        }
      }
    })
  }

  if (board_list.length > 0) {
    await DBMySQL.transaction(async (transaction) => {
      for (let cnt = 0; cnt < board_list.length; cnt++) {
        if (board_list[cnt].change_bool) {
          if (board_list[cnt].seq) {
            await GroupBoardListService.updateGroupBoard(transaction, board_list[cnt])
          } else {
            await GroupBoardListService.createGroupBoard(transaction, board_list[cnt])
          }
        }
      }
    })
  }
  res.json(output)
}))

routes.put('/updateprofile', Auth.isAuthenticated(Role.LOGIN_USER), Util.common_path_upload.fields([{ name: 'image' }]), Wrap(async (req, res) => {
  req.accepts('application/json')
  const params = req.body;
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  _.forEach(req.files, (value) => {
    if (value[0].fieldname === 'image') {
      params.image = value[0].filename ? '/common/' + value[0].filename : "";
    }
  });
  if (params.image === "null") {
    params.image = "";
  }
  params.title = "";
  const options = {
    profile: JSON.stringify(params)
  };
  const output = new StdObject()
  const rs_gorup_info = await GroupService.updateGroupInfo(DBMySQL, options, group_seq);
  output.add('result', rs_gorup_info);
  res.json(output)
}))

routes.get('/:group_seq(\\d+)/OpenVideoList', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await checkGroupAuth(DBMySQL, req, false)
  const group_open_vid = await OperationDataService.getCompleteIsOpenVideoDataLists(group_seq, 12);
  const output = new StdObject()
  output.add('vid_list', group_open_vid)
  res.json(output)
}))

routes.get('/:group_seq(\\d+)/OpenBoardList', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await checkGroupAuth(DBMySQL, req, false)
  const group_open_vid = await GroupBoardDataService.getGroupBoardOpenTopList(DBMySQL, group_seq);
  const output = new StdObject()
  output.add('board_list', group_open_vid)
  res.json(output)
}))

routes.get('/membergroupallcount', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json')
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false)
  const option = {};
  if (req.query.group_type) {
    option.group_type = req.query.group_type;
  }
  const member_group_count = await GroupService.getMemberGroupAllCount(DBMySQL, member_seq, option)

  const output = new StdObject()
  output.add('group_all_count', member_group_count)
  res.json(output)
}))

routes.post('/memberstatusupdate', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, false, true)
  const mem_info = req.body.mem_info;
  const output = new StdObject()

  const result = await GroupService.GroupMemberStatusUpdate(DBMySQL, group_seq, mem_info)
  output.add('result', result)

  res.json(output)
}))

routes.get('/:group_seq(\\d+)/:group_member_seq(\\d+)/member_detail', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)

  const group_member_info = await GroupService.getGroupMemberInfoDetail(DBMySQL, group_seq, group_member_seq)

  const output = new StdObject()
  output.add('group_member_info', group_member_info)
  res.json(output)
}))

routes.get('/:group_seq(\\d+)/member/:member_seq(\\d+)/summary/comment', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await checkGroupAuth(DBMySQL, req)
  const member_seq = await getMemberSeq(req)

  const group_summary_comment_list = await GroupService.getSummaryCommentList(DBMySQL, group_seq, member_seq, req)

  const output = new StdObject()
  output.adds(group_summary_comment_list)
  res.json(output)
}))

routes.delete('/delete/comments', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_data_seq = req.body

  for (let cnt = 0; cnt < comment_data_seq.operation.length; cnt++) {
    await OperationCommentService.deleteComment(DBMySQL, comment_data_seq.operation[cnt].content_data_seq, comment_data_seq.operation[cnt].seq, req)
  }
  for (let cnt = 0; cnt < comment_data_seq.board.length; cnt++) {
    await DBMySQL.transaction(async (transaction) => {
      await GroupBoardDataService.DeleteComment(transaction, comment_data_seq.board[cnt].content_data_seq, comment_data_seq.board[cnt].seq);
    })
  }
  res.json(output);
}))

routes.get('/mychannellist', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false)
  let is_active_only = true;
  if (req.query.all_list === 'true') {
    is_active_only = false;
  }
  const filter = {
    status: req.query.status ? req.query.status : null,
    grade: req.query.grade ? req.query.grade :null,
    manager: req.query.manager ? req.query.manager : null,
    member_count: req.query.member_count ? true : false,
  };
  if (req.query.group_type) {
    filter.group_type = req.query.group_type;
  }
  const page = {
    orderby: req.query.orderby ? req.query.orderby : null,
    limit: req.query.limit ? req.query.limit : null,
    page: req.query.page ? req.query.page : null,
  }
  const member_group_list = await GroupService.getMemberGroupList(DBMySQL, member_seq, is_active_only, filter, page)

  const output = new StdObject()
  output.add('member_group_list', member_group_list)
  res.json(output)
}))
export default routes
