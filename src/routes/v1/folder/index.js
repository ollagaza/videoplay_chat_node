import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import GroupService from '../../../service/member/GroupService'
import DBMySQL from '../../../database/knex-mysql'
import OperationFolderService from '../../../service/operation/OperationFolderService'
import OperationService from '../../../service/operation/OperationService'
import StdObject from '../../../wrapper/std-object'
import log from '../../../libs/logger'
import Util from '../../../utils/baseutil'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
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

routes.get('/relation(/:folder_seq(\\d+))?', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_seq = Util.parseInt(req.params.folder_seq, null)
  let folder_info = null
  let parent_list = null
  if (folder_seq) {
    folder_info = await OperationFolderService.getFolderInfo(DBMySQL, group_seq, folder_seq)
    parent_list = await OperationFolderService.getParentFolderList(DBMySQL, group_seq, folder_info.parent_folder_list)
  }
  const child_folder_list = await OperationFolderService.getChildFolderList(DBMySQL, group_seq, folder_seq)
  const output = new StdObject()
  output.add('folder_info', folder_info)
  output.add('parent_list', parent_list)
  output.add('child_folder_list', child_folder_list)
  res.json(output)
}))

routes.delete('/deletefolder', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  try {
    const folder_info = req.body.folder_info
    log.debug('[Router Folder -> index]', '[/deletefolder]', folder_info)

    const folder_chk = await OperationFolderService.isFolderFileCheck(DBMySQL, folder_info.group_seq, folder_info.seq)

    await DBMySQL.transaction(async (transaction) => {
      if (!folder_chk) {
        await OperationFolderService.deleteOperationFolder(transaction, folder_info.group_seq, folder_info.seq)
        res.json(new StdObject(0, '폴더 삭제가 완료 되었습니다.', '200'))
      } else {
        res.json(new StdObject(1, '해당 폴더 또는 하위 폴더에 파일이 존재 합니다.<br/>파일 삭제 또는 이동 후 다시 시도 하여 주세요', '200'))
      }
    })
  } catch (e) {
    throw new StdObject(-1, '폴더 삭제 중 오류가 발생 하였습니다.', '400')
  }
}))

routes.put('/moveoperation', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  try {
    const request_data = req.body.request_data

    log.debug('[Router Folder -> index]', '[/moveoperation]', request_data)

    await DBMySQL.transaction(async (transaction) => {
      if (request_data.operation_folder_list.length > 0) {
        for (let cnt = 0; cnt < request_data.operation_folder_list.length; cnt++) {
          const params = {
            target_folder_info: request_data.operation_folder_list[cnt],
            folder_info: request_data.folder_info,
          }
          await OperationFolderService.moveFolder(transaction, params)
        }
      }
      if (request_data.operation_info_list.length > 0) {
        const operation_seq_list = []
        for (let cnt = 0; cnt < request_data.operation_info_list.length; cnt++) {
          operation_seq_list.push(request_data.operation_info_list[cnt].seq)
        }
        await OperationService.moveOperationFolder(transaction, operation_seq_list, request_data.folder_info)
      }
      res.json(new StdObject(0, '이동이 완료 되었습니다.', '200'))
    })
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
  req.accepts('application/json')
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const seq_list = req.body.seq_list

  const result = await OperationFolderService.updateStatusTrash(DBMySQL, seq_list, group_seq, false)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'T')
  res.json(output)
}))

routes.delete('/trash', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const seq_list = req.body.seq_list

  const result = await OperationFolderService.updateStatusTrash(DBMySQL, seq_list, group_seq, true)

  const output = new StdObject()
  output.add('result', result)
  output.add('status', 'Y')
  res.json(output)
}))

export default routes
