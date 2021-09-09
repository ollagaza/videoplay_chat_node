import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import Util from '../../utils/Util'
import ServiceConfig from '../../service/service-config'
import OperationService from '../../service/operation/OperationService'
import GroupService from '../../service/group/GroupService'
import MemberService from '../../service/member/MemberService'
import Constants from '../../constants/constants'

const routes = Router()

const checkToken = async (request) => {
  const token_info = request.token_info
  const agent_id = request.headers['agent-id']
  if (token_info.getAgentId() !== agent_id) {
    throw new StdObject(2001, '잘못된 요청입니다.', 403, request.headers)
  }
  const operation_seq = request.params.operation_seq
  const group_seq = request.body ? Util.parseInt(request.body.channel_seq, null) : null
  const member_seq = token_info.getId()
  return { token_info, operation_seq, group_seq, member_seq }
}

routes.post('/start', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { token_info, group_seq, member_seq } = await checkToken(req)

  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
  const group_member_info = await GroupService.getGroupMemberInfo(DBMySQL, group_seq, member_seq)
  if (group_member_info.isEmpty()) {
    throw new StdObject(2002, '등록된 회원이 아닙니다.', 403)
  }

  const agent_id = token_info.getAgentId()
  const request_body = req.body ? req.body : {}

  log.d(req, `[AGENT 01] 수술 시작`, agent_id, request_body, group_seq, member_seq)

  const current_date = Util.currentFormattedDate('yyyy-mm-dd HH:MM:ss')
  let operation_name = Util.trim(request_body.operation_name)
  if (!operation_name) {
    operation_name = `${current_date}`
  }

  const operation_code = `${agent_id}_${current_date}`
  const operation_date = request_body.operation_date ? request_body.operation_date : current_date.substr(0, 10)
  const hour = request_body.hour ? request_body.hour : current_date.substr(11, 2)
  const minute = request_body.minute ? request_body.minute : current_date.substr(14, 2)
  const folder_seq = request_body.folder_seq ? request_body.folder_seq : null
  const mode = request_body.mode ? request_body.mode : 'operation'
  const operation_info = {
    operation_code,
    operation_name,
    operation_date,
    hour,
    minute,
    folder_seq,
    mode
  }

  const operation_body = {
    operation_info,
    meta_data: {}
  }

  const create_operation_result = await OperationService.createOperation(DBMySQL, member_info, group_member_info, operation_body, 'Y')

  log.d(req, `[AGENT 02] 수술 시작 (id: ${create_operation_result.get('operation_seq')})`, request_body, group_seq, member_seq, create_operation_result.toJSON())

  const output = new StdObject()
  output.add('operation_id', create_operation_result.get('operation_seq'))
  output.add('operation_name', operation_name)
  output.add('mode', mode)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/upload/video', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  const { operation_seq } = await checkToken(req)
  const file_type = 'video'
  log.d(req, `[AGENT 03] 수술 동영상 업로드 시작 (id: ${operation_seq})`, operation_seq)

  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)
  const upload_result = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type, 'file', Constants.AGENT_VIDEO_FILE_NAME)

  log.d(req, `[AGENT 04] 수술 동영상 업로드 종료 (id: ${operation_seq})`, operation_seq, upload_result)

  await OperationService.onUploadComplete(operation_info, false)
  log.d(req, `[AGENT 06] 수술 업로드 완료 요청 (id: ${operation_seq})`, operation_seq)

  await OperationService.onAgentVideoUploadComplete(operation_info)
  log.d(req, `[AGENT 07] 수술 업로드 완료 요청 완료 (id: ${operation_seq})`, operation_seq)

  const output = new StdObject()
  output.add('page_url', ServiceConfig.get('service_url') + `/v2/curation/${operation_seq}`)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/upload/refer/one', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  const { operation_seq } = await checkToken(req)

  log.d(req, `[AGENT 21] 첨부파일 업로드 시작 (id: ${operation_seq})`, operation_seq)

  const file_type = 'refer'
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)
  const refer_file_seq = await OperationService.uploadOperationFile(DBMySQL, req, res, operation_info, file_type, 'file')
  await OperationService.updateStorageSize(operation_info)

  log.d(req, `[AGENT 22] 첨부파일 업로드 완료 (id: ${operation_seq})`, operation_seq, refer_file_seq)

  const output = new StdObject()
  output.add('refer_file_seq', refer_file_seq)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/upload/refer/zip(/:encoding)?', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  const { operation_seq } = await checkToken(req)
  let encoding = req.params.encoding
  if (!encoding) encoding = 'utf-8'
  log.d(req, operation_seq, encoding) // outputs zip entries information
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)

  const temp_directory = ServiceConfig.get('temp_directory_root') + '/' + Util.getRandomId()
  await Util.createDirectory(temp_directory)
  await Util.uploadByRequest(req, res, 'file', temp_directory, Util.getRandomId())

  const upload_file_info = req.file
  if (Util.isEmpty(upload_file_info)) {
    throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
  }
  const zip_file_path = upload_file_info.path
  const file_type = 'refer'

  OperationService.uploadOperationFileByZip(operation_info, temp_directory, zip_file_path, encoding, file_type)

  const output = new StdObject()
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/files', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  const { operation_seq, member_seq } = await checkToken(req)

  const file_list = await OperationService.getAgentFileList(operation_seq, req.query, member_seq)
  const output = new StdObject()
  output.add('file_list', file_list)
  res.json(output)
}))

routes.delete('/:operation_seq(\\d+)', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  const { operation_seq, member_seq } = await checkToken(req)
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)

  await OperationService.updateStatusTrash(null, operation_info.group_seq, { seq_list: [ operation_seq ] }, false, false, member_seq)
  const output = new StdObject()
  res.json(output)
}))
export default routes
