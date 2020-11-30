import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import DBMySQL from '../../database/knex-mysql'
import NoticeService from '../../service/notice/NoticeService'
import StdObject from '../../wrapper/std-object'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const notice_list = await NoticeService.getNoticeList(req, true)
  const output = new StdObject()
  output.add('notice_list', notice_list)
  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const notice_list = await NoticeService.createNotice(req.body)
  const output = new StdObject()
  output.add('notice_list', notice_list)
  res.json(output)
}))

export default routes
