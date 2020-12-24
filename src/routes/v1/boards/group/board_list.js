import { Router } from 'express'
import Auth from '../../../../middlewares/auth.middleware'
import Util from '../../../../utils/baseutil'
import log from '../../../../libs/logger'
import Role from '../../../../constants/roles'
import Wrap from '../../../../utils/express-async'
import StdObject from '../../../../wrapper/std-object'
import DBMySQL from '../../../../database/knex-mysql'
import _ from "lodash";
import OperationFolderService from "../../../../service/operation/OperationFolderService";
import GroupBoardListService from "../../../../service/board/GroupBoardListService";
import GroupBoardDataService from '../../../../service/board/GroupBoardDataService';

const routes = Router()

routes.get('/groupmenulist/:group_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const group_seq = req.params.group_seq
  const output = new StdObject()
  const folder_list = await OperationFolderService.getGroupFolderByDepthZero(DBMySQL, group_seq)
  const board_list = await GroupBoardListService.getGroupBoardList(DBMySQL, group_seq)

  output.add('folder_list', folder_list)
  output.add('board_list', board_list)

  res.json(output)
}))

routes.delete('delmenulist/:group_seq(\\d+)/:menu_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const group_seq = req.params.group_seq
    const menu_seq = req.params.menu_seq
    const board_data_cnt = await GroupBoardDataService.getBoardDataCount(DBMySQL, group_seq, menu_seq);

    await DBMySQL.transaction(async (transaction) => {
      if (board_data_cnt > 0) {
        await GroupBoardListService.delGroupBoardList(transaction, group_seq, menu_seq)
        res.json(new StdObject(0, '게시판 삭제가 완료 되었습니다.', '200'))
      } else {
        res.json(new StdObject(1, '해당 게시판에 게시글이 존재 합니다.<br/>게시글 삭제 또는 이동 후 다시 시도 하여 주세요', '200'))
      }
    })
  } catch (e) {
    throw new StdObject(-1, '게시판 삭제 중 오류가 발생 하였습니다.', '400')
  }
}))

export default routes
