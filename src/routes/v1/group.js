import { Router } from 'express';
import Auth from '../../middlewares/auth.middleware';
import Util from '../../utils/baseutil';
import log from '../../libs/logger';
import Role from "../../constants/roles";
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import GroupService from '../../service/member/GroupService';

const routes = Router();

const checkGroupAuth = async (database, req, check_group_auth = true, throw_exception = false) => {
  return await GroupService.checkGroupAuth(database, req, false, check_group_auth, throw_exception)
}

const getGroupMemberSeq = (request) => Util.parseInt(request.params.group_member_seq, 0)

routes.get('/me', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false)
  const member_group_list = await GroupService.getMemberGroupList(DBMySQL, member_seq)

  const output = new StdObject();
  output.add('member_group_list', member_group_list);
  res.json(output);
}));

routes.get('/:group_seq(\\d+)/me', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const member_group_info = await GroupService.getMemberGroupInfoWithGroup(DBMySQL, group_seq, member_seq)

  const output = new StdObject();
  output.add('group_info', member_group_info);
  res.json(output);
}));

routes.get('/:group_seq(\\d+)/auth', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { is_active_group_member } = await checkGroupAuth(DBMySQL, req, true, false)

  const output = new StdObject();
  output.add('is_active_group_member', is_active_group_member);
  res.json(output);
}));

routes.post('/:group_seq(\\d+)/members', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_list = await GroupService.getGroupMemberList(DBMySQL, group_seq, req)

  const output = new StdObject();
  output.adds(group_member_list);
  res.json(output);
}));

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/delete', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  const is_delete_operation = req.body.is_delete_operation === true
  await GroupService.deleteMember(DBMySQL, group_seq, member_seq, group_member_seq, is_delete_operation)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/delete', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.unDeleteMember(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/admin', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.changeGradeAdmin(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/admin', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.changeGradeNormal(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/pause', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.pauseMember(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/pause', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = getGroupMemberSeq(req)
  await GroupService.unPauseMember(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.post('/:group_seq(\\d+)/invite', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_info, group_seq } = await checkGroupAuth(DBMySQL, req)
  await GroupService.inviteGroupMembers(DBMySQL, group_seq, member_info, req.body)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.get('/invite/:invite_code', Auth.isAuthenticated(), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const member_seq = token_info ? token_info.getId() : null
  const invite_code = req.params.invite_code
  log.d(req, token_info, member_seq, invite_code)
  const group_invite_info = await GroupService.getInviteGroupInfo(DBMySQL, invite_code, null, member_seq, true)

  const output = new StdObject();
  output.add('group_invite_info', group_invite_info);
  res.json(output);
}));

routes.post('/join/:invite_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false)
  log.d(req, member_seq)
  const invite_seq = Util.parseInt(req.params.invite_seq, 0)
  const invite_code = req.body.invite_code
  const group_seq = await GroupService.joinGroup(DBMySQL, invite_seq, member_seq, invite_code)

  const output = new StdObject();
  output.add('group_seq', group_seq);
  res.json(output);
}));

export default routes;
