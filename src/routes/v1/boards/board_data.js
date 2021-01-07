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

routes.get('/getboarddatalist/:group_seq(\\d+)/:board_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const result = await GroupBoardDataService.getBoardData(DBMySQL, req)
  output.adds(result)
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

export default routes
