import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import DBMySQL from '../../database/knex-mysql'
import NoticeService from '../../service/notice/NoticeService'
import StdObject from '../../wrapper/std-object'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const notice_list = await NoticeService.getNoticeList(req)
  const output = new StdObject()
  output.adds(notice_list)
  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const member_seq = token_info.getId()
  const notice_seq = await NoticeService.createNotice(member_seq, req.body)
  const output = new StdObject()
  output.add('notice_seq', notice_seq)
  res.json(output)
}))

routes.put('/:notice_seq(\\d+)', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const notice_seq = req.params.notice_seq
  const result = await NoticeService.modifyNotice(notice_seq, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const result = await NoticeService.deleteNoticeBySeqList(req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:notice_seq(\\d+)', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const notice_seq = req.params.notice_seq
  const result = await NoticeService.deleteNotice(notice_seq)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.get('/:notice_seq(\\d+)', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const token_info = req.token_info
  const notice_seq = req.params.notice_seq
  const result = await NoticeService.getNotice(notice_seq, token_info && token_info.isAdmin())
  const output = new StdObject()
  output.adds(result)
  res.json(output)
}))

routes.get('/code/:code', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const token_info = req.token_info
  const code = req.params.code
  const result = await NoticeService.getNoticeByCode(code, token_info && token_info.isAdmin())
  const output = new StdObject()
  output.adds(result)
  res.json(output)
}))

routes.post('/:notice_seq(\\d+)/file', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const notice_seq = req.params.notice_seq
  const notice_file_seq = await NoticeService.uploadFile(notice_seq, req, res)
  const output = new StdObject()
  output.add('notice_file_seq', notice_file_seq)
  res.json(output)
}))

routes.delete('/:notice_seq(\\d+)/file/:notice_file_seq(\\d+)', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const notice_seq = req.params.notice_seq
  const notice_file_seq = req.params.notice_file_seq
  const result = await NoticeService.deleteFile(notice_seq, notice_file_seq)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

export default routes
