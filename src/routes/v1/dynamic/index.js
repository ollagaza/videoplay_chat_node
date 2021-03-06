import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DynamicService from "../../../service/dynamic/DynamicService";
import DynamicAdminService from "../../../service/dynamic/DynamicAdminService";
import Util from "../../../utils/Util";
import GroupService from "../../../service/group/GroupService";
import DBMySQL from "../../../database/knex-mysql";

const routes = Router()

routes.get('/:template_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const template_type = req.params.template_type;
  const dynamic_list = await DynamicService.getDynamicTemplateList(template_type)
  output.add('dynamic_list', dynamic_list)
  res.json(output)
}))

routes.get('/template/:template_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const template_id = req.params.template_id
  output.add('template', await DynamicAdminService.getDynamicTemplateOne(template_id))
  res.json(output)
}))

routes.get('/result/:id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const result_id = req.params.id
  output.add('template_result', await DynamicService.getDynamicResult(result_id))
  res.json(output)
}))

routes.delete('/result/:operation_seq(\\d+)/:_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const result_id = req.params._id
  const operation_seq = req.params.operation_seq;
  const delete_resutl = await DynamicService.deleteTemplateResult(result_id)
  output.add('questionnaire_list', await DynamicService.getDynamicResultList(operation_seq))
  res.json(output)
}))

routes.get('/result_list/:id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const result_id = Util.parseInt(req.params.id)
  output.add('template_result_list', await DynamicService.getDynamicResultList(result_id))
  res.json(output)
}))

routes.post('/:api_type/:api_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  output.add('result', await DynamicService.saveTemplateResult(group_auth, req))
  res.json(output)
}))

routes.put('/:api_type/:api_key/:id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  output.add('result', await DynamicService.updateTemplateResult(group_auth, req))
  res.json(output)
}))

export default routes
