import { Router } from 'express'
import Auth from '../../../../middlewares/auth.middleware'
import Role from '../../../../constants/roles'
import Wrap from '../../../../utils/express-async'
import StdObject from '../../../../wrapper/std-object'
import Util from "../../../../utils/Util";
import DBMySQL from "../../../../database/mysql-model";
import GroupService from "../../../../service/group/GroupService";
import QuestionService from "../../../../service/curriculum/QuestionService";
const routes = Router()

routes.post('/:api_mode/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)

  if (req.params.api_mode === 'create') {
    output.add('result', await QuestionService.createQuestion(DBMySQL, group_auth, req))
  } else {
    output.add('result', await QuestionService.updateQuestion(DBMySQL, group_auth, req))
  }
  res.json(output)
}))

routes.get('/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  output.add('result', await QuestionService.getQuestion(DBMySQL, group_auth, req))
  res.json(output)
}))

export default routes
