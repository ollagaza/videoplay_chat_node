import { Router } from 'express'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import DynamicAdminService from "../../service/dynamic/DynamicAdminService";

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const page_navigation = req.query.navigation ? JSON.parse(req.query.navigation) : { cur_page: 1, list_count: 10, page_count: 10 }
  const field_order = req.query.field_order ? JSON.parse(req.query.field_order) : { field: '_id', direction: 'desc' }
  const search_option = req.query.search_option ? JSON.parse(req.query.search_option) : null
  const search_keyword = req.query.search_keyword ? req.query.search_keyword : null
  const dynamictemplatelist = await DynamicAdminService.getDynamicTemplateList(page_navigation, field_order, search_keyword, search_option)
  output.adds(dynamictemplatelist)
  res.json(output)
}))

routes.get('/:_id', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const _id = req.params._id
  output.add('template', await DynamicAdminService.getDynamicTemplateOne(_id))
  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  output.add('result', await DynamicAdminService.createDynamicTemplate(req.body))
  res.json(output)
}))

routes.put('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  res.json(output)
}))

routes.delete('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  res.json(output)
}))

export default routes
