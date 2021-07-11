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
