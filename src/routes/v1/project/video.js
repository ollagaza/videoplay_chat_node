import { Router } from 'express'
import Wrap from '../../../utils/express-async'
import Util from '../../../utils/baseutil'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import GroupService from '../../../service/member/GroupService'
import StudioService from '../../../service/project/StudioService'
import { VideoProjectModel } from '../../../database/mongodb/VideoProject'

const routes = Router()

const getProjectSeq = (request) => {
  if (request && request.params) {
    return Util.parseInt(request.params.project_seq, 0)
  }
  return 0
}

routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const video_project_list = await StudioService.getVideoProjectList(token_info.getGroupSeq())

  const output = new StdObject()
  output.add('video_project_list', video_project_list)
  res.json(output)
}))

routes.get('/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = getProjectSeq(req)
  const video_project = await StudioService.getVideoProjectInfo(project_seq)

  const output = new StdObject()
  output.add('video_project', video_project)
  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_seq, group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const result = await StudioService.createVideoProject(group_member_info, member_seq, req)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.put('/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = getProjectSeq(req)

  const result = await StudioService.modifyVideoProject(project_seq, req)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.put('/favorite/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = getProjectSeq(req)
  const result = await StudioService.updateFavorite(project_seq, true)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', true)
  res.json(output)
}))

routes.delete('/favorite/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = getProjectSeq(req)
  const result = await StudioService.updateFavorite(project_seq, false)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', false)
  res.json(output)
}))

routes.put('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const result = await StudioService.updateStatus(req, group_seq, 'T')

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'T')
  res.json(output)
}))

routes.delete('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const result = await StudioService.updateStatus(req, group_seq, 'Y')

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'Y')
  res.json(output)
}))

routes.delete('/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = getProjectSeq(req)

  const result = await StudioService.deleteVideoProject(group_seq, project_seq)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.put('/:project_seq(\\d+)/image', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = getProjectSeq(req)
  const image_url = await StudioService.uploadImage(project_seq, req, res)
  const output = new StdObject()
  output.add('image_url', image_url)
  res.json(output)
}))

routes.post('/make/:project_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_member_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const project_seq = getProjectSeq(req)
  const result = await StudioService.makeProjectVideo(group_member_info, project_seq)
  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'R')
  res.json(output)
}))

routes.get('/make/process', Wrap(async (req, res) => {
  const is_success = await StudioService.updateMakeProcess(req)
  res.send(is_success ? 'ok' : 'fail')
}))

routes.get('/test/:project_seq(\\d+)', Wrap(async (req, res) => {
  const project_seq = getProjectSeq(req)
  const is_success = await StudioService.requestMakeProject(project_seq)
  res.send(is_success ? 'ok' : 'fail')
}))

routes.post('/operation', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const operation_seq_list = req.body.operation_seq_list
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const video_project_list = await VideoProjectModel.findByOperationSeq(group_seq, operation_seq_list, '-sequence_list')

  const output = new StdObject()
  output.add('video_project_list', video_project_list)
  res.json(output)
}))

export default routes
