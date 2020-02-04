import { Router } from 'express';
import Auth from '../../middlewares/auth.middleware';
import Util from '../../utils/baseutil';
import log from '../../libs/logger';
import Role from "../../constants/roles";
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberService from '../../service/member/MemberService';
import GroupService from '../../service/member/GroupService';

const routes = Router();

const getBaseInfo = (req) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId()
  const group_seq = req.params.group_seq

  return {
    token_info,
    member_seq,
    group_seq
  }
}

const checkGroupAuth = async (database, req, check_group_auth = true, throw_exception = false) => {
  const { token_info, member_seq, group_seq } = getBaseInfo(req)
  const member_info = await MemberService.getMemberInfo(database, member_seq)
  if (!MemberService.isActiveMember(member_info)) {
    throw MemberService.getMemberStateError(member_info)
  }
  let is_active_group_member = true;
  if ( token_info.getRole() === Role.ADMIN ) {
    is_active_group_member = true
  } else if (check_group_auth) {
    is_active_group_member = await GroupService.isActiveGroupMember(database, group_seq, member_seq)
    if ( !is_active_group_member && throw_exception) {
      throw new StdObject(-1, '권한이 없습니다', 403)
    }
  }
  return {
    member_seq,
    group_seq,
    is_active_group_member
  }
}

routes.get('/me', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq } = await checkGroupAuth(DBMySQL, req, false)
  const member_group_list = await GroupService.getMemberGroupList(DBMySQL, member_seq)

  const output = new StdObject();
  output.add('member_group_list', member_group_list);
  res.json(output);
}));

routes.get('/:group_seq(\\d+)/auth', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { is_active_group_member } = await checkGroupAuth(DBMySQL, req, true, false)

  const output = new StdObject();
  output.add('is_active_group_member', is_active_group_member);
  res.json(output);
}));

routes.get('/:group_seq(\\d+)/member_list', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_list = await GroupService.getGroupMemberList(DBMySQL, group_seq)

  const output = new StdObject();
  output.add('group_member_list', group_member_list);
  res.json(output);
}));

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/delete', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = req.params.group_member_seq
  const is_delete_operation = req.body.is_delete_operation === true
  await GroupService.deleteMember(DBMySQL, group_seq, member_seq, group_member_seq, is_delete_operation)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/delete', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = req.params.group_member_seq
  await GroupService.unDeleteMember(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/admin', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = req.params.group_member_seq
  await GroupService.changeGradeAdmin(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/admin', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = req.params.group_member_seq
  await GroupService.changeGradeNormal(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.put('/:group_seq(\\d+)/:group_member_seq(\\d+)/pause', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = req.params.group_member_seq
  await GroupService.pauseMember(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.delete('/:group_seq(\\d+)/:group_member_seq(\\d+)/pause', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const group_member_seq = req.params.group_member_seq
  await GroupService.unPauseMember(DBMySQL, group_seq, member_seq, group_member_seq)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.post('/:group_seq(\\d+)/invite', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq, group_seq } = await checkGroupAuth(DBMySQL, req)
  const invite_email_list = req.body.invite_email_list
  await GroupService.inviteGroupMembers(DBMySQL, group_seq, member_seq, invite_email_list)

  const output = new StdObject();
  output.add('result', true);
  res.json(output);
}));

routes.post('/:group_seq(\\d+)/join', Auth.isAuthenticated(Role.DEFAULT), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { member_seq } = await checkGroupAuth(DBMySQL, req)
  const invite_id = req.body.invite_id
  const invite_code = req.body.invite_code
  const group_info = await GroupService.joinGroup(DBMySQL, member_seq, invite_id, invite_code)

  const output = new StdObject();
  output.add('group_info', group_info);
  res.json(output);
}));


export default routes;
