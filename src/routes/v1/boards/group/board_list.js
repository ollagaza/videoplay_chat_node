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
          res.json(new StdObject(1, '게시판 삭제가 불가능합니다.<br/>최소 한 개의 게시판이 존재해야 합니다.', '200'))
        } else if (board_data_cnt === 0) {
          await GroupBoardListService.delGroupBoardList(transaction, group_seq, menu_seq)
          res.json(new StdObject(0, '성공적으로 반영되었습니다.', '200'))
        } else {
          res.json(new StdObject(1, '이 게시판의 게시글을 모두 삭제한 후에<br/>게시판을 삭제하실 수 있습니다.', '200'))
        }
      })
    } else {
      throw new StdObject(-100, '권한이 없습니다', 403)
    }
  } catch (e) {
    throw new StdObject(-1, '게시판 삭제 중 오류가 발생 하였습니다.', '400')
  }
}))

export default routes
