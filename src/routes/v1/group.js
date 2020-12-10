import { Router } from 'express'
import Auth from '../../middlewares/auth.middleware'
import Util from '../../utils/baseutil'
import log from '../../libs/logger'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import GroupService from '../../service/member/GroupService'
import _ from "lodash";
import baseutil from "../../utils/baseutil";

const routes = Router()

const checkGroupAuth = async (database, req, check_group_auth = true, throw_exception = false) => {
  return await GroupService.checkGroupAuth(database, req, false, check_group_auth, throw_exception)
}

const getGroupMemberSeq = (request) => Util.parseInt(request.params.group_member_seq, 0)

routes.get('/me', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false)
  const member_group_list = await GroupService.getMemberGroupList(DBMySQL, member_seq)

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
  const result = await GroupService.requestJoinGroup(group_seq, member_info)

  const output = new StdObject()
  output.add('result', result)
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

routes.post('/updateJoinManage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const params = {
    group_message: req.body.join_message,
    group_question: JSON.stringify(req.body.question_list)
  }
  const output = new StdObject()

  const result = await GroupService.updateJoinManage(DBMySQL, group_seq, params)
  output.add('result', result)

  res.json(output)
}))

export default routes
