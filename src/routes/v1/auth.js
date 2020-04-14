import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import DBMySQL from '../../database/knex-mysql';
import AuthService from '../../service/member/AuthService'
import MemberService from '../../service/member/MemberService';
import MemberLogService from '../../service/member/MemberLogService'

const routes = Router();

routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const member_info = await AuthService.login(DBMySQL, req)
    const output = await Auth.getTokenResult(res, member_info, Role.MEMBER);
    // const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;
    // await MemberLogService.createMemberLog(DBMySQL, member_info.seq, '0000', 'login', ip, 'N');
    return res.json(output);
  } catch (e) {
    const output = e;
    return res.json(output);
  }
}));

routes.post('/token/refresh', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const member_seq = token_info.getId();

  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)

  const output = await Auth.getTokenResult(res, member_info, Role.MEMBER);
  return res.json(output);
}));

export default routes;
