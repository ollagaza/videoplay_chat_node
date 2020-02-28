import { Router } from 'express';
import log from '../../libs/logger'
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import DBMySQL from '../../database/knex-mysql';
import AuthService from '../../service/member/AuthService'
import StdObject from '../../wrapper/std-object';
import MemberService from '../../service/member/MemberService';

const routes = Router();

routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const member_info = await AuthService.login(DBMySQL, req.body)
    const output = await Auth.getTokenResult(res, member_info, Role.MEMBER);
    return res.json(output);
  } catch (e) {
    const output = e;
    return res.json(output);
  }
}));

routes.post('/email', Wrap(async(req, res) => {
  req.accepts('application/json');

  if (!req.body || !req.body.auth_key || !req.body.member_seq) {
    throw new StdObject(-1, "잘못된 접근입니다.", 400);
  }

  const member_seq = req.body.member_seq;
  const auth_key = req.body.auth_key;

  const member_auth_mail_model =  new MemberAuthMailModel(DBMySQL);
  const has_auth_mail = await member_auth_mail_model.hasAuthMail(member_seq, auth_key);
  if (has_auth_mail === false) {
    throw new StdObject(-1, "인증정보가 존재하지 않습니다.", 400);
  }

  (
    async () => {
      await member_auth_mail_model.deleteAuthMail(member_seq);
    }
  )()

  res.json(new StdObject());
}));

routes.post('/token/refresh', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();

  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)

  const output = await Auth.getTokenResult(res, member_info, Role.MEMBER);
  return res.json(output);
}));

export default routes;
