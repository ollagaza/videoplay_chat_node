import { Router } from 'express';
import Wrap from '../../../utils/express-async';
import Util from '../../../utils/baseutil';
import Auth from '../../../middlewares/auth.middleware';
import Role from "../../../constants/roles";
import StdObject from '../../../wrapper/std-object';
import DBMySQL from '../../../database/knex-mysql';
import MemberService from '../../../service/member/MemberService'
import MemberInfo from "../../../wrapper/member/MemberInfo";
import MemberInfoSub from "../../../wrapper/member/MemberInfoSub";

const routes = Router();

routes.post('/memberlist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const search_text = req.body.searchText;

  const find_user_info_list = await MemberService.findMembers(DBMySQL, search_text)

  output.add('user_data', find_user_info_list);
  output.add("searchText", search_text);

  res.json(output);
}));

export default routes;
