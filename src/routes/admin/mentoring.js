import { Router } from 'express'
import Wrap from '../../utils/express-async'
import DBMySQL from '../../database/knex-mysql'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import MentoringAdminService from '../../service/mentoring/MentoringAdminService'

const routes = Router()

routes.get('/getbestmentolist/:medical_code', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const medical_code = req.params.medical_code
    const result = await MentoringAdminService.getCategoryForBestMentos(DBMySQL, medical_code)
    output.add('result', result)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/getallmentolist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const search_keyword = JSON.parse(req.query[0]).search_keyword
    const page_navigation = JSON.parse(req.query[1]).page_navigation
    const category_code = JSON.parse(req.query[2]).category_code

    const result = await MentoringAdminService.getAllMentoList(DBMySQL, search_keyword, page_navigation, category_code)
    output.add('total_count', result.total_count)
    output.add('data', result.data)
    output.add('total_page', result.total_page)
    output.add('page_navigation', result.page_navigation)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/chkbestmento', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const medical_code = JSON.parse(req.query[0]).medical_code
    const best_num = JSON.parse(req.query[1]).best_num
    const result = await MentoringAdminService.chkBestMento(DBMySQL, medical_code, best_num)
    output.add('result', result)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.delete('/deletebestmento', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const medical_code = req.body.medical_code
    const seq = req.body.group_seq

    const filters = { category_code: medical_code, group_seq: seq }

    const result = await MentoringAdminService.updateBestMento(DBMySQL, filters, 0)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.put('/updatebestmento', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const medical_code = req.body.medical_code
    const seq = req.body.group_seq
    const best_num = req.body.best_num

    const filters = { category_code: medical_code, group_seq: seq }

    const result = await MentoringAdminService.updateBestMento(DBMySQL, filters, best_num)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

export default routes
