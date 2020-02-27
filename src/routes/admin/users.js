import { Router } from 'express';
import log from '../../libs/logger';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import AdminMemberService from '../../service/member/AdminMemberService'
import service_config from "../../service/service-config";
import MemberInfo from "../../wrapper/member/MemberInfo";
import MemberInfoSub from "../../wrapper/member/MemberInfoSub";

const routes = Router();

routes.get('/me', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const lang = Auth.getLanguage(req);
  const token_info = req.token_info;
  const member_seq = token_info.getId();
  const member_info = await AdminMemberService.getMemberInfoWithSub(DBMySQL, member_seq, lang);

  const output = new StdObject();
  output.add('member_info', member_info.member_info);
  output.add('member_sub_info', member_info.member_sub_info);

  res.json(output);
}));

routes.post('/memberlist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const searchParam = req.body.searchObj;
  const searchOrder = req.body.searchOrder;
  const page_navigation = req.body.page_navigation;

  const find_user_info_list = await AdminMemberService.adminfindMembers(DBMySQL, searchParam, searchOrder, page_navigation)

  output.add('user_data', find_user_info_list);
  output.add("searchObj", searchParam);

  res.json(output);
}));

routes.put('/memberUsedUpdate', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const updateData = req.body.setData;
  const search_option = req.body.searchObj;
  let output = new StdObject();

  await DBMySQL.transaction(async(transaction) => {
    output = await AdminMemberService.updateMemberUsedforSendMail(transaction, updateData, search_option)
  });

  (async () => {
    try {
      await AdminMemberService.sendMailforMemberChangeUsed(DBMySQL, output, output.variables.appr_code, updateData, service_config.get('service_url'), output.variables.search_option);
    } catch (e) {
      log.e(req, e);
    }
  })();

  res.json(output);
}));

routes.post('/getMongoData', Wrap(async(req, res) => {
  req.accepts('application/json');
  const getDataParam = req.body.getData;
  const getLangParam = req.body.getLang;
  let result_data = null;
  let output = new StdObject();

  try {
    if (getDataParam === 'medical') {
      result_data = await AdminMemberService.getMongoData(getLangParam);
      output.add('medical', result_data);
    }
  } catch(exception) {
    output.error = -1;
    output.message = exception.message;
  }
  res.json(output);
}));

export default routes;
