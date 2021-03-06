import { Router } from 'express'
import Auth from '../../../../middlewares/auth.middleware'
import Util from '../../../../utils/Util'
import log from '../../../../libs/logger'
import Role from '../../../../constants/roles'
import Wrap from '../../../../utils/express-async'
import StdObject from '../../../../wrapper/std-object'
import DBMySQL from '../../../../database/knex-mysql'
import _ from "lodash";
import OperationFolderService from "../../../../service/operation/OperationFolderService";
import GroupBoardListService from "../../../../service/board/GroupBoardListService";
import GroupBoardDataService from '../../../../service/board/GroupBoardDataService';
import GroupService from "../../../../service/group/GroupService";

const routes = Router()

routes.get('/groupmenulist/:group_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const group_seq = req.params.group_seq
  const { is_active_group_member, is_group_admin, is_group_manager } = await GroupService.checkGroupAuth(DBMySQL, req, false, true)
  const output = new StdObject()
  const folder_list = await OperationFolderService.getGroupFolderByDepthZero(DBMySQL, group_seq)
  const board_list = await GroupBoardListService.getGroupBoardList(DBMySQL, group_seq)

  output.add('is_manage', (is_group_admin || is_group_manager))
  output.add('is_active_group_member', is_active_group_member)
  output.add('folder_list', folder_list)
  output.add('board_list', board_list)

  res.json(output)
}))

routes.get('/getgroupboards/:group_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_seq, is_active_group_member, is_group_admin, is_group_manager } = await GroupService.checkGroupAuth(DBMySQL, req, false, true)
  const group_seq = req.params.group_seq
  const output = new StdObject()
  const group_member_info = await GroupService.getGroupMemberInfo(DBMySQL, group_seq, member_seq)
  const board_list = await GroupBoardListService.getGroupBoardList(DBMySQL, group_seq)

  output.add('is_manage', (is_group_admin || is_group_manager))
  output.add('is_active_group_member', is_active_group_member)
  output.add('group_member_info', group_member_info)
  output.add('board_list', board_list)
  output.add('last_update', await GroupBoardListService.getGroupBoardLastUpdate(DBMySQL, group_seq))

  res.json(output)
}))

routes.delete('/delmenulist/:group_seq(\\d+)/:menu_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const { is_group_admin, is_group_manager } = await GroupService.checkGroupAuth(DBMySQL, req, true, true)
    const group_seq = req.params.group_seq
    const menu_seq = req.params.menu_seq
    const board_data_cnt = await GroupBoardDataService.getBoardDataCount(DBMySQL, group_seq, menu_seq);
    const board_list_cnt = await GroupBoardListService.getBoardListCount(DBMySQL, group_seq);

    if (is_group_admin || is_group_manager) {
      await DBMySQL.transaction(async (transaction) => {
        if (board_list_cnt === 1) {
          res.json(new StdObject(1, '?????? ????????? ??????????????????.<br/>?????? ??? ?????? ????????? ???????????? ?????????.', '200'))
        } else if (board_data_cnt === 0) {
          await GroupBoardListService.delGroupBoardList(transaction, group_seq, menu_seq)
          res.json(new StdObject(0, '??????????????? ?????????????????????.', '200'))
        } else {
          res.json(new StdObject(1, '??? ????????? ???????????? ?????? ????????? ??????<br/>????????? ????????? ??? ????????????.', '200'))
        }
      })
    } else {
      throw new StdObject(-100, '????????? ????????????', 403)
    }
  } catch (e) {
    throw new StdObject(-1, '?????? ?????? ??? ????????? ?????? ???????????????.', '400')
  }
}))

export default routes
