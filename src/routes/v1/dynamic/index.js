import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DynamicService from "../../../service/dynamic/DynamicService";
import Util from "../../../utils/Util";

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const page_navigation = req.query.navigation ? JSON.parse(req.query.navigation) : { cur_page: 1, list_count: 10, page_count: 10 }
  const field_order = req.query.field_order ? JSON.parse(req.query.field_order) : { field: '_id', direction: 'desc' }
  const search_option = req.query.search_option ? JSON.parse(req.query.search_option) : null
  const search_keyword = req.query.search_keyword ? req.query.search_keyword : null
  const dynamictemplatelist = await DynamicService.getDynamicTemplateList(page_navigation, field_order, search_keyword, search_option)
  output.adds(dynamictemplatelist)
  res.json(output)
}))

routes.get('/:id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const result_id = Util.parseInt(req.params.id)
  output.add('template_result', await DynamicService.getDynamicResult(result_id))
  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  output.add('result', await DynamicService.saveTemplateResult(req.body))
  res.json(output)
}))

routes.put('/:id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const result_id = req.params.id
  output.add('result', await DynamicService.updateDynamicTemplate(result_id, req.body))
  res.json(output)
}))

export default routes
