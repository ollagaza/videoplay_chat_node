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

routes.get('/', Wrap(async (req, res) => {
  req.accepts('application/json')
  // const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, false)
  const output = new StdObject()
  output.add('treatlist', await GroupChannelHomeService.getTreatmentList(DBMySQL));
  const my_group_list = await GroupService.getMemberGroupList(DBMySQL, 1, true)
  output.add('my_group_list', my_group_list)
  const arr_group_seq = []
  Object.keys(my_group_list).filter(item => arr_group_seq.push(my_group_list[item].group_seq))
  output.add('my_group_new', await GroupChannelHomeService.getMyGroupNewNews(DBMySQL, arr_group_seq))
  output.add('recommend_group_list', await GroupChannelHomeService.getRecommendGroupList(DBMySQL, 3))
  output.add('open_operation_top5', await GroupChannelHomeService.getOpenOperationTop5(DBMySQL))
  output.add('open_board_top5', await GroupChannelHomeService.getOpenBoardTop5(DBMySQL))
  res.json(output)
}))

export default routes
