import { Router } from 'express'
import striptags from 'striptags'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import helper_service from '../../service/helper/HelperService'

const routes = Router()

routes.post('/gethelperlist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  output.add('helperlist', await helper_service.getHelperList(DBMySQL))
  res.json(output)
}))

routes.post('/gethelperinfo', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const code = req.body.code
  output.add('helperinfo', await helper_service.getHelperInfo(DBMySQL, code))
  res.json(output)
}))

routes.put('/cudhelper', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const param = req.body.param
  const saveData = req.body.saveData
  if (saveData.code !== 'css' && saveData.code !== 'script') {
    saveData.search_text = striptags(saveData.tutorial_html)
  }
  await helper_service.cudHelper(DBMySQL, param, saveData)
  output.add('result', param.seq)
  res.json(output)
}))

export default routes
