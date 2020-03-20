import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberService from '../../service/member/MemberService'
import MemberAuthMailModel from '../../database/mysql/member/MemberAuthMailModel';
import AuthService from "../../service/member/AuthService";

const routes = Router();

routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');
  try {
    const member_info = await AuthService.login(DBMySQL, req)
    const output = await Auth.getTokenResult(res, member_info, Role.MEMBER);
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
