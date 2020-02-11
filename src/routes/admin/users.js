import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberService from '../../service/member/MemberService'
import MemberInfo from "../../wrapper/member/MemberInfo";
import MemberInfoSub from "../../wrapper/member/MemberInfoSub";

const routes = Router();

routes.get('/me', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const lang = Auth.getLanguage(req);
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const member_info = await MemberService.getMemberInfoWithSub(DBMySQL, member_seq, lang);

  const output = new StdObject();
  output.add('member_info', member_info.member_info);
  output.add('member_sub_info', member_info.member_sub_info);

  res.json(output);
}));

routes.post('/memberlist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const searchParam = req.body.searchObj;
  const page_navigation = req.body.page_navigation;

  const find_user_info_list = await MemberService.findMembers(DBMySQL, searchParam, page_navigation)

  output.add('user_data', find_user_info_list);
  output.add("searchObj", searchParam);

  res.json(output);
}));

routes.put('/memberUsedUpdate', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');

  const updateData = req.body.setData;
  const search_option = req.body.searchObj;

  await DBMySQL.transaction(async(transaction) => {
    const result = await MemberService.updateAdminMembers(transaction, updateData, search_option)

    if (!result) {
      throw new StdObject(-1, '회원정보 수정 실패', 400);
    }
  });

  res.json(new StdObject());
}));

export default routes;
