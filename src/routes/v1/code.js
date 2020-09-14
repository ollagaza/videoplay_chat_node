import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import CodeSceneService from '../../service/code/CodeSceneService'

const routes = Router()

routes.get('/scene', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res, next) => {
  const result = new StdObject()
  result.add('result', CodeSceneService.getCodeMap())
  res.json(result)
}))

export default routes
