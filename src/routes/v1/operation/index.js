import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import GroupService from '../../../service/member/GroupService'
import DBMySQL from '../../../database/knex-mysql'
import OperationDataService from '../../../service/operation/OperationDataService'
import StdObject from '../../../wrapper/std-object'
import OperationService from '../../../service/operation/OperationService'
import OperationCommentService from '../../../service/operation/OperationCommentService'
import OperationClipService from '../../../service/operation/OperationClipService'
import log from '../../../libs/logger'
import OperationFileService from '../../../service/operation/OperationFileService'
import OperationStorageModel from '../../../database/mysql/operation/OperationStorageModel'
import Util from '../../../utils/baseutil'
import OperationLinkService from '../../../service/operation/OperationLinkService'

const routes = Router()

const getBaseInfo = async (request, check_auth = false, check_writer = false, import_operation_info = false) => {
  const api_type = request.params.api_type
  const api_key = request.params.api_key

  if (Util.isEmpty(api_type) || Util.isEmpty(api_key)) {
    throw new StdObject(-1, '잘못된 접근입니다.', 400)
  }

  const { group_seq, group_member_info, member_info, member_seq, is_group_admin } = await GroupService.checkGroupAuth(DBMySQL, request, true, true, true)
  const comment_seq = request.params.comment_seq
  const clip_id = request.params.clip_id
  const phase_id = request.params.phase_id

  const result = {
    member_seq,
    group_seq,
    group_member_info,
    member_info,
    operation_data_info: null,
    operation_data_seq: null,
    is_writer: false,
    is_auth: false,
    link_info: null,
    link_code: null,
    is_link: false,
    is_editor_link: false,
    is_download_link: false,
    comment_seq,
    clip_id,
    phase_id,
    operation_seq: null,
    operation_info: null,
    is_group_admin
  }

  if (api_type === 'mentoring') {
    await getMentoringInfo(result, api_key)
  } else if (api_type === 'link') {
    await getLinkInfo(result, api_key)
  } else if (api_type === 'drive') {
    await getDriveInfo(result, api_key)
  } else if (api_type === 'open_video') {
    await getOpenVideoInfo(result, api_key)
  } else {
    throw new StdObject(-2, '잘못된 접근입니다.', 400)
  }

  if (import_operation_info && !result.operation_info) {
    result.operation_info = await OperationService.getOperationInfo(DBMySQL, result.operation_seq, null, false, true)
  }

  if (check_auth && !result.is_auth) {
    throw new StdObject(102, '접근 권한이 없습니다.', 403)
  }
  if (check_writer && !result.is_writer) {
    throw new StdObject(101, '수정 권한이 없습니다.', 403)
  }

  return result
}

const getDriveInfo = async (result, operation_seq) => {
  const group_seq = result.group_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, true)
  if (!operation_info || operation_info.isEmpty()) {
    throw new StdObject(100, '등록된 정보가 없습니다.', 400)
  }

  const is_writer = operation_info.group_seq === group_seq
  const is_auth = operation_info.group_seq === group_seq

  result.operation_seq = operation_info.seq
  result.operation_info = operation_info
  result.is_writer = is_writer
  result.is_auth = is_auth

  const operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, operation_seq)
  if (operation_data_info && !operation_data_info.isEmpty()) {
    result.operation_data_info = operation_data_info
    result.operation_data_seq = operation_data_info.seq
  }
}

const getLinkInfo = async (result, link_code) => {
  const link_info = await OperationLinkService.getOperationLinkByCode(DBMySQL, link_code)
  if (!link_info || link_info.isEmpty()) {
    throw new StdObject(100, '등록된 정보가 없습니다.', 400)
  }

  const is_editor_link = link_info.auth === OperationLinkService.AUTH_WRITE
  const is_download_link = link_info.enable_download === 1
  result.operation_seq = link_info.operation_seq
  result.link_info = link_info
  result.link_code = link_code
  result.is_writer = is_editor_link
  result.is_auth = true
  result.is_link = true
  result.is_editor_link = is_editor_link
  result.is_download_link = is_download_link

  const operation_data_info = await OperationDataService.getOperationDataByOperationSeq(DBMySQL, result.operation_seq)
  if (operation_data_info && !operation_data_info.isEmpty()) {
    result.operation_data_info = operation_data_info
    result.operation_data_seq = operation_data_info.seq
  }
}

const getMentoringInfo = async (result, operation_data_seq) => {
  const group_seq = result.group_seq
  const operation_data_info = await OperationDataService.getOperationData(DBMySQL, operation_data_seq)
  if (!operation_data_info || operation_data_info.isEmpty()) {
    throw new StdObject(100, '등록된 정보가 없습니다.', 400)
  }
  if (operation_data_info.type !== 'M') {
    throw new StdObject(-3, '잘못된 접근입니다.', 403)
  }

  const is_writer = operation_data_info.group_seq === group_seq
  const is_auth = operation_data_info.mento_group_seq === group_seq || operation_data_info.group_seq === group_seq

  result.operation_seq = operation_data_info.operation_seq
  result.operation_data_info = operation_data_info
  result.operation_data_seq = operation_data_seq
  result.is_writer = is_writer
  result.is_auth = is_auth
}

const getOpenVideoInfo = async (result, operation_data_seq) => {
  const group_seq = result.group_seq
  const operation_data_info = await OperationDataService.getOperationData(DBMySQL, operation_data_seq)
  if (!operation_data_info || operation_data_info.isEmpty()) {
    throw new StdObject(100, '등록된 정보가 없습니다.', 400)
  }
  if (!operation_data_info.is_open_video) {
    throw new StdObject(-3, '잘못된 접근입니다.', 403)
  }

  const is_writer = operation_data_info.group_seq === group_seq

  result.operation_seq = operation_data_info.operation_seq
  result.operation_data_info = operation_data_info
  result.operation_data_seq = operation_data_seq
  result.is_writer = is_writer
  result.is_auth = true
}

routes.get('/:api_type/:api_key/view', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const base_info = await getBaseInfo(req, true)
  const output = await OperationService.getOperationDataView(base_info.operation_seq, base_info.group_seq)
  output.add('is_link', base_info.is_link)
  output.add('is_editor_link', base_info.is_editor_link)
  output.add('is_download_link', base_info.is_download_link)
  res.json(output)
}))

routes.post('/:api_type/:api_key/info', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const base_info = await getBaseInfo(req, true)
  const output = await OperationService.getOperationDataInfo(base_info.operation_seq, base_info.group_seq, req.body)
  output.add('is_link', base_info.is_link)
  output.add('is_editor_link', base_info.is_editor_link)
  output.add('is_download_link', base_info.is_download_link)
  res.json(output)
}))

routes.put('/:api_type/:api_key/modify', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_info, member_seq } = await getBaseInfo(req, true, true, true)
  const output = await OperationService.updateOperation(member_seq, operation_info, req.body)
  res.json(output)
}))

routes.put('/:api_type/:api_key/doc', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_data_seq } = await getBaseInfo(req, true, true)
  const result = await OperationDataService.changeDocument(operation_data_seq, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/open_video', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_data_seq, group_seq } = await getBaseInfo(req, true, true)
  const result = await OperationDataService.changeOpenVideo(DBMySQL, group_seq, operation_data_seq, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.get('/:api_type/:api_key/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_data_seq } = await getBaseInfo(req, false)
  const comment_list = await OperationCommentService.getCommentList(DBMySQL, operation_data_seq, req.query)

  const output = new StdObject()
  output.add('comment_list', comment_list)

  if (req.query && req.query.with_count === 'y') {
    const comment_count = await OperationCommentService.getCommentCount(DBMySQL, operation_data_seq, req.query.parent_seq)
    output.add('comment_count', comment_count)
  }

  res.json(output)
}))

routes.post('/:api_type/:api_key/comment', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { member_info, group_member_info, operation_data_seq } = await getBaseInfo(req, true)
  const comment_seq = await OperationCommentService.createComment(DBMySQL, member_info, group_member_info, operation_data_seq, req.body)

  const output = new StdObject()
  output.add('comment_seq', comment_seq)
  res.json(output)
}))

routes.get('/:api_type/:api_key/comment/count', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_data_seq } = await getBaseInfo(req, false)
  const comment_count = await OperationCommentService.getCommentCount(DBMySQL, operation_data_seq, req.query.parent_seq)

  const output = new StdObject()
  output.add('comment_count', comment_count)
  res.json(output)
}))

routes.get('/:api_type/:api_key/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_data_seq, comment_seq } = await getBaseInfo(req, false)
  const comment_info = await OperationCommentService.getComment(DBMySQL, operation_data_seq, comment_seq)

  const output = new StdObject()
  output.add('comment_info', comment_info)

  if (req.query && req.query.with_count === 'y') {
    const comment_count = await OperationCommentService.getCommentCount(DBMySQL, operation_data_seq, req.query.parent_seq)
    output.add('comment_count', comment_count)
  }

  res.json(output)
}))

routes.put('/:api_type/:api_key/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_data_seq, comment_seq } = await getBaseInfo(req, true)
  const comment_info = await OperationCommentService.changeComment(DBMySQL, operation_data_seq, comment_seq, req.body)

  const output = new StdObject()
  output.add('comment_info', comment_info)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/comment/:comment_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_data_seq, comment_seq } = await getBaseInfo(req, true)
  const result = await OperationCommentService.deleteComment(DBMySQL, operation_data_seq, comment_seq, req.body)

  const output = new StdObject()
  output.add('result', result)

  res.json(output)
}))

routes.post('/:api_type/:api_key/clip', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_info, member_info } = await getBaseInfo(req, true, true, true)

  const create_result = await OperationClipService.createClip(operation_info, member_info, req.body)
  const output = new StdObject()
  output.add('result', create_result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { clip_id } = await getBaseInfo(req, true, true)

  const update_result = await OperationClipService.updateClip(clip_id, req.body)
  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/clip/:clip_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { clip_id, operation_info } = await getBaseInfo(req, true, true, true)

  const delete_result = await OperationClipService.deleteById(clip_id, operation_info, req.body)
  const output = new StdObject()
  output.add('result', delete_result)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/clip/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id, operation_seq } = await getBaseInfo(req, true, true)
  const result = await OperationClipService.unsetPhaseOne(operation_seq, phase_id, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.post('/:api_type/:api_key/phase', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { operation_info } = await getBaseInfo(req, true, true, true)

  const create_result = await OperationClipService.createPhase(operation_info, req.body)
  const output = new StdObject()
  output.add('phase', create_result.phase_info)
  output.add('phase_id', create_result.phase_id)
  res.json(output)
}))

routes.put('/:api_type/:api_key/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id } = await getBaseInfo(req, true, true)

  const phase_desc = req.body.phase_desc
  const update_result = await OperationClipService.updatePhase(phase_id, phase_desc)
  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/phase/:phase_id/clips', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id } = await getBaseInfo(req, true, true)

  const result = await OperationClipService.setPhase(phase_id, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/phase/:phase_id', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { phase_id, operation_seq } = await getBaseInfo(req, true, true)

  const delete_result = await OperationClipService.deletePhase(operation_seq, phase_id)
  const output = new StdObject()
  output.add('result', delete_result)
  res.json(output)
}))

routes.put('/:api_type/:api_key/thumbnail', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_seq } = await getBaseInfo(req, true, true)
  const thumbnail_url = await OperationDataService.setThumbnailImage(operation_seq, req, res)

  const output = new StdObject()
  output.add('thumbnail_url', thumbnail_url)

  res.json(output)
}))

routes.get('/:api_type/:api_key/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, false, true)
  const file_type = req.params.file_type
  const { video_file_list, refer_file_list } = await OperationFileService.getFileList(DBMySQL, operation_info, file_type)
  const output = new StdObject()
  output.add('video_file_list', video_file_list)
  output.add('refer_file_list', refer_file_list)
  res.json(output)
}))

routes.post('/:api_type/:api_key/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, true, true)
  const file_type = req.params.file_type
  const upload_seq = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type)

  const output = new StdObject()
  output.add('upload_seq', upload_seq)
  res.json(output)
}))

routes.delete('/:api_type/:api_key/files/:file_type', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const output = new StdObject()
  const file_type = req.params.file_type
  if (file_type !== OperationFileService.TYPE_REFER) {
    throw new StdObject(-1, '잘못된 요청입니다.', 400)
  }

  const file_seq_list = req.body.file_seq_list
  if (!file_seq_list || file_seq_list.length <= 0) {
    throw new StdObject(-2, '잘못된 요청입니다.', 400)
  }
  const { operation_info } = await getBaseInfo(req, true, true, true)

  await DBMySQL.transaction(async (transaction) => {
    const storage_seq = operation_info.storage_seq
    await OperationFileService.deleteReferFileList(transaction, operation_info, file_seq_list)
    await new OperationStorageModel(transaction).updateUploadFileSize(storage_seq, file_type)
  })

  res.json(output)
}))

routes.get('/:api_type/:api_key/video/url', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const { operation_info } = await getBaseInfo(req, true, false, true)
  const download_url = OperationService.getVideoDownloadURL(operation_info)
  const output = new StdObject()
  output.add('download_url', download_url)
  res.json(output)
}))

export default routes
