import _ from "lodash";
import { Router } from 'express'
import log from '../../../libs/logger'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import baseutil from "../../../utils/baseutil";
import GroupService from "../../../service/group/GroupService";
import GroupChannelHomeService from "../../../service/group/GroupChannelHomeService";

const routes = Router()

routes.get('/test', Wrap(async (req, res) => {
  GroupChannelHomeService.GroupDataCounting();
  res.end()
}))

routes.get('/:menu_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  let menu_id = req.params.menu_id
  const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, false)
  const output = new StdObject()
  const treatlist = await GroupChannelHomeService.getTreatmentList(DBMySQL)
  output.add('treatlist', treatlist);
  const my_group_list = await GroupService.getMemberGroupList(DBMySQL, member_seq, true)
  output.add('my_group_list', _.filter(my_group_list, { group_type: 'G'}))
  const arr_group_seq = []
  Object.keys(my_group_list).filter(item => arr_group_seq.push(my_group_list[item].group_seq))
  output.add('my_group_new', await GroupChannelHomeService.getMyGroupNewNews(DBMySQL, arr_group_seq))
  output.add('recommend_group_list', await GroupChannelHomeService.getRecommendGroupList(DBMySQL, 3))
  if (menu_id === 'all_medical') {
    menu_id = treatlist[0].code;
  }
  output.add('category_group_list', await GroupChannelHomeService.getCategoryList(DBMySQL, menu_id))
  output.add('open_operation_top5', await GroupChannelHomeService.getOpenOperationTop5(DBMySQL))
  output.add('open_board_top5', await GroupChannelHomeService.getOpenBoardTop5(DBMySQL))
  res.json(output)
}))

routes.get('/getcategorygrouplist/:menu_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  let menu_id = req.params.menu_id
  const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, false)
  const output = new StdObject()
  output.add('category_group_list', await GroupChannelHomeService.getCategoryList(DBMySQL, menu_id))
  res.json(output)
}))

routes.get('/group_search/:search_keyword', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const search_keyword = req.params.search_keyword
  const output = new StdObject()
  output.adds(await GroupChannelHomeService.getSearchResult(DBMySQL, search_keyword))
  res.json(output)
}))

export default routes
