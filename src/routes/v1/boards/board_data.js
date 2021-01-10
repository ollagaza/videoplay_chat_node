import { Router } from 'express'
import _ from "lodash";
import Auth from '../../../middlewares/auth.middleware'
import Util from '../../../utils/baseutil'
import log from '../../../libs/logger'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import GroupBoardDataService from "../../../service/board/GroupBoardDataService";

const routes = Router()

routes.get('/getboarddatadetail/:board_data_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const board_data_seq = req.params.board_data_seq
  output.add('board_detail', await GroupBoardDataService.getBoardDataDetail(DBMySQL, board_data_seq))
  output.add('board_comment_list', await GroupBoardDataService.getBoardCommentList(DBMySQL, board_data_seq))
  res.json(output);
}))

routes.get('/getboarddatalist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const result = await GroupBoardDataService.getBoardDataPagingList(DBMySQL, req)
  output.adds(result)
  res.json(output);
}))

routes.post('/save_board_comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_data = req.body.comment_data

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.CreateUpdateBoardComment(transaction, comment_data)
    output.add('result', result)
  })
  res.json(output);
}))

routes.post('/save_board_data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const board_data = req.body.board_data

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.CreateUpdateBoardData(transaction, board_data)
    output.add('result', result)
  })
  res.json(output);
}))

routes.put('/updateviewcnt/:board_data_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const board_data_seq = req.params.board_data_seq

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.updateBoardViewCnt(transaction, board_data_seq)
    output.add('result', result)
  })
  res.json(output);
}))

routes.delete('/delete_comment/:board_data_seq(\\d+)/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const comment_seq = req.params.comment_seq
  const board_data_seq = req.params.board_data_seq

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.DeleteComment(transaction, board_data_seq, comment_seq)
    output.add('result', result)
  })
  res.json(output);
}))

routes.delete('/delete_board_data/:board_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const board_seq = req.params.board_seq

  await DBMySQL.transaction(async (transaction) => {
    const result = await GroupBoardDataService.DeleteBoardData(transaction, board_seq)
    output.add('result', result)
  })
  res.json(output);
}))

export default routes
