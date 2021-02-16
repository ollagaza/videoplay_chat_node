import _ from "lodash";
import { Router } from 'express'
import log from '../../../libs/logger'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import Util from "../../../utils/Util";
import GroupService from "../../../service/group/GroupService";
import GroupChannelHomeService from "../../../service/group/GroupChannelHomeService";

const routes = Router()

routes.get('/test', Wrap(async (req, res) => {
  GroupChannelHomeService.GroupDataCounting();
  res.end()
}))

routes.get('/home/:menu_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const member_seq = token_info.getId()
  let menu_id = req.params.menu_id
  const output = new StdObject()
  const treatlist = await GroupChannelHomeService.getTreatmentList(DBMySQL)
  output.add('treatlist', treatlist);
  let my_group_list = await GroupService.getMemberGroupList(DBMySQL, member_seq, false)
  my_group_list = _.filter(my_group_list, item => item.group_type === 'G' && (item.group_member_status === 'Y' || item.group_member_status === 'P'))
  output.add('my_group_list', my_group_list)
  const arr_group_seq = []
  Object.keys(my_group_list).filter(item => my_group_list[item].group_member_status === 'Y' ? arr_group_seq.push(my_group_list[item].group_seq) : null)
  output.add('my_group_new', await GroupChannelHomeService.getMyGroupNewNews(DBMySQL, my_group_list, arr_group_seq))
  output.add('recommend_group_list', await GroupChannelHomeService.getRecommendGroupList(DBMySQL, 3))
  log.debug('getRecommendGroupList', treatlist)
  if (treatlist.length !== 0 && menu_id === 'all_medical') {
    menu_id = treatlist[0].code;
  } else {
    menu_id = null
  }
  if (menu_id) {
    output.add('category_group_list', await GroupChannelHomeService.getCategoryList(DBMySQL, menu_id))
  } else {
    output.add('category_group_list', null)
  }
  output.add('open_operation_top5', await GroupChannelHomeService.getOpenOperationTop5(DBMySQL))
  output.add('open_board_top5', await GroupChannelHomeService.getOpenBoardTop5(DBMySQL))
  res.json(output)
}))

routes.get('/getcategorygrouplist/:menu_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  let menu_id = req.params.menu_id
  const output = new StdObject()
  output.add('category_group_list', await GroupChannelHomeService.getCategoryList(DBMySQL, menu_id))
  res.json(output)
}))

routes.get('/group_search', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const member_seq = token_info.getId()
  const output = new StdObject()
  output.adds(await GroupChannelHomeService.getSearchResult(DBMySQL, req, member_seq))
  res.json(output)
}))

routes.get('/remote/group_member/update/counts', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  output.adds(await GroupChannelHomeService.GroupMemberDataCounting())
  res.json(output)
}))

export default routes
