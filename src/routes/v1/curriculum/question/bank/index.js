import { Router } from 'express'
import Auth from '../../../../../middlewares/auth.middleware'
import Role from '../../../../../constants/roles'
import Wrap from '../../../../../utils/express-async'
import StdObject from "../../../../../wrapper/std-object";
import Util from "../../../../../utils/Util";
import DBMySQL from "../../../../../database/knex-mysql";
import GroupService from "../../../../../service/group/GroupService";
import QuestionService from "../../../../../service/curriculum/QuestionService";

const routes = Router()

routes.post('/:api_mode/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  output.add('result', await QuestionService.createQuestionBank(DBMySQL, group_auth, req))
  res.json(output)
}))

routes.put('/:api_mode/:api_key(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  output.add('result', await QuestionService.updateQuestionBank(DBMySQL, group_auth, req))
  res.json(output)
}))

routes.get('/:api_key(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  output.add('result', await QuestionService.getQuestionBank(DBMySQL, req))
  res.json(output)
}))

routes.get('/list/:group_seq', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  output.adds(await QuestionService.getQuestionBankList(DBMySQL, group_auth, req))
  res.json(output)
}))

export default routes
