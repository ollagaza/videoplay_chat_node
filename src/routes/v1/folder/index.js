import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import GroupService from '../../../service/group/GroupService'
import DBMySQL from '../../../database/knex-mysql'
import OperationFolderService from '../../../service/operation/OperationFolderService'
import OperationService from '../../../service/operation/OperationService'
import StdObject from '../../../wrapper/std-object'
import log from '../../../libs/logger'
import Util from '../../../utils/Util'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const group_folder_info = await OperationFolderService.getGroupFolderInfo(DBMySQL, group_seq, req)
  const output = new StdObject()
  output.adds(group_folder_info)
  res.json(output)
}))

routes.get('/:group_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const group_seq = req.params.group_seq
  const group_folder_info = await OperationFolderService.getGroupFolderInfo(DBMySQL, group_seq, req)
  const output = new StdObject()
  output.adds(group_folder_info)
  res.json(output)
}))

routes.get('/last_update', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const last_update = await OperationFolderService.getGroupFolderLastUpdate(DBMySQL, group_seq)
  const output = new StdObject()
  output.add('last_update', last_update)
  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_info = await OperationFolderService.createOperationFolder(DBMySQL, req.body, group_seq, member_seq)
  const output = new StdObject()
  output.add('folder_info', folder_info)
  res.json(output)
}))

routes.post('/rename(/:folder_seq(\\d+))?', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_seq = Util.parseInt(req.params.folder_seq, null)
  const folder_name = req.body.folder_name;
  const folder_info = await OperationFolderService.renameOperationFolder(DBMySQL, folder_seq, folder_name)
  const output = new StdObject()
  output.add('folder_info', folder_info)
  res.json(output)
}))

routes.delete('/deletefolder', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true, true)
  const folder_info = req.body.folder_info
  if (folder_info.group_seq !== group_seq) {
    throw new StdObject(-1, '권한이 없습니다.', 400)
  }
  const is_empty = await OperationFolderService.isFolderEmpty(DBMySQL, folder_info.group_seq, folder_info.seq)
  let output = null
  if (!is_empty) {
    output = new StdObject(1, '해당 폴더 또는 하위 폴더에 파일이 존재합니다.<br/>파일 삭제 또는 이동 후 다시 시도하여 주세요.', 400)
  } else {
    await OperationFolderService.deleteOperationFolder(DBMySQL, group_seq, folder_info.seq)
    output = new StdObject(0, '폴더 삭제가 완료 되었습니다.', 200)
  }
  res.json(output)
}))

routes.put('/move', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  try {
    const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
    const request_data = req.body.request_data

    log.d(req, request_data)

    if (request_data.operation_folder_list.length > 0) {
      for (let cnt = 0; cnt < request_data.operation_folder_list.length; cnt++) {
        const params = {
          target_folder_info: request_data.operation_folder_list[cnt],
          folder_info: request_data.folder_info,
        }
        await OperationFolderService.moveFolder(DBMySQL, params)
      }
    }
    if (request_data.operation_info_list.length > 0) {
      const operation_seq_list = []
      for (let cnt = 0; cnt < request_data.operation_info_list.length; cnt++) {
        operation_seq_list.push(request_data.operation_info_list[cnt].seq)
      }
      await OperationService.moveOperationFolder(DBMySQL, group_seq, operation_seq_list, request_data.folder_info)
    }
    res.json(new StdObject(0, '이동이 완료 되었습니다.', '200'))
  } catch (e) {
    log.e(req, e)
    throw new StdObject(-1, '이동 중 오류가 발생 하였습니다.', '400')
  }
}))

routes.put('/:folder_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const folder_seq = req.params.folder_seq

  const result = await OperationFolderService.updateStatusFavorite(DBMySQL, folder_seq, false)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:folder_seq(\\d+)/favorite', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const folder_seq = req.params.folder_seq

  const result = await OperationFolderService.updateStatusFavorite(DBMySQL, folder_seq, true)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.put('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, is_group_admin, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
  req.accepts('application/json')
  const result = await OperationFolderService.updateStatusTrash(DBMySQL, req.body, group_seq, false, is_group_admin, member_seq)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'T')
  res.json(output)
}))

routes.delete('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
  req.accepts('application/json')
  const result = await OperationFolderService.updateStatusTrash(DBMySQL, req.body, group_seq, true, false, null)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'Y')
  res.json(output)
}))

routes.get('/folder_size_sync', Wrap(async (req, res) => {
  const output = await OperationFolderService.syncFolderTotalSize(DBMySQL)
  res.json(output)
}))

routes.get('/folder_size_sync/:group_seq(\\d+)', Wrap(async (req, res) => {
  const group_seq = req.params.group_seq
  const output = await OperationFolderService.syncFolderTotalSize(DBMySQL, group_seq)
  res.json(output)
}))

routes.get('/:folder_seq(\\d+)/empty', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_seq = req.params.folder_seq
  const is_empty = await OperationFolderService.isFolderEmpty(DBMySQL, group_seq, folder_seq, true)
  const output = new StdObject()
  output.add('is_empty', is_empty)
  res.json(output)
}))

routes.get('/:folder_seq(\\d+)/able/restore', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { group_seq, group_grade_number, is_group_admin } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_seq = req.params.folder_seq

  const is_able = await OperationFolderService.isFolderAbleRestore(folder_seq, group_seq, group_grade_number, is_group_admin)
  const output = new StdObject()
  output.add('is_able', is_able)

  res.json(output)
}))

export default routes
