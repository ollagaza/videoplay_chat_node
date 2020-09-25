import Zip from 'adm-zip'
import jschardet from 'jschardet'
import iconv from 'iconv-lite'
import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'
import OperationService from '../../service/operation/OperationService'
import GroupService from '../../service/member/GroupService'
import MemberService from '../../service/member/MemberService'
import OperationClipService from '../../service/operation/OperationClipService'

const routes = Router()

const checkMachine = async (request) => {
  const token_info = request.token_info
  const machine_id = request.headers['machine-id']
  log.d(request, machine_id, token_info.toJSON())
  if (token_info.getMachineId() !== machine_id) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }
}

const getUserTokenInfo = async (request) => {
  const user_token = await Auth.verifyTokenByString(request.headers['user-token'])
  if (user_token.error !== 0) {
    throw user_token
  }
  return user_token.get('token_info')
}

routes.post('/start', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  req.accepts('application/json')
  await checkMachine(req)
  const user_token_info = await getUserTokenInfo(req)
  log.d(req, '[user_token_info]', user_token_info)
  const member_seq = user_token_info.getId()
  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
  const group_seq = user_token_info.setGroupSeq()
  const group_member_info = await GroupService.getGroupMemberInfo(DBMySQL, group_seq, member_seq)
  if (group_member_info.isEmpty()) {
    throw new StdObject(-2, '등록된 회원이 아닙니다.', 403)
  }

  const request_body = req.body ? req.body : {}
  const current_date = Util.currentFormattedDate('yyyy-mm-dd HH:MM:ss')

  const operation_name = request_body.operation_name ? request_body.operation_name : `SurgBox_${current_date}`
  const operation_code = request_body.operation_code ? request_body.operation_code : operation_name
  const operation_date = request_body.operation_date ? request_body.operation_date : current_date.substr(0, 10)
  const hour = request_body.hour ? request_body.hour : current_date.substr(11, 2)
  const minute = request_body.minute ? request_body.minute : current_date.substr(14, 2)
  const operation_info = {
    'operation_code': operation_code,
    'operation_name': operation_name,
    'operation_date': operation_date,
    'hour': hour,
    'minute': minute,
  }

  const operation_body = {
    operation_info,
    meta_data: {}
  }

  const create_operation_result = await OperationService.createOperation(DBMySQL, member_info, group_member_info, operation_body, 'D')
  const output = new StdObject()
  output.add('operation_id', create_operation_result.get('operation_seq'))
  output.add('operation_name', operation_name)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/upload', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  await checkMachine(req)

  const operation_seq = req.params.operation_seq
  const file_type = 'video'
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)

  log.d(req, 'operation_info', operation_info)
  const upload_result = await OperationService.uploadOperationFileAndUpdate(DBMySQL, req, res, operation_info, file_type, 'file')

  const output = new StdObject()
  output.add('upload_seq', upload_result.upload_seq)
  output.add('url', upload_result.file_url)
  output.add('file_path', upload_result.file_path)
  res.json(output)
}))

routes.put('/:operation_seq(\\d+)/end', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  await checkMachine(req)
  const operation_seq = req.params.operation_seq
  await OperationService.requestAnalysis(DBMySQL, null, operation_seq, false)
  await OperationService.updateStatus(DBMySQL, [operation_seq], 'Y')

  const output = new StdObject()
  output.add('url', ServiceConfig.get('service_url') + `/v2/curation/${operation_seq}`)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/clip', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  await checkMachine(req)

  req.accepts('application/json')
  const operation_seq = req.params.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)

  const create_result = await OperationClipService.createClip(operation_info, req.body)
  const output = new StdObject()
  output.add('result', create_result)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/file/one', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  await checkMachine(req)

  const operation_seq = req.params.operation_seq
  const file_type = 'refer'
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)
  log.d(req, 'operation_info', operation_info)

  const upload_result = await OperationService.uploadOperationFileAndUpdate(DBMySQL, req, res, operation_info, file_type, 'file')

  const output = new StdObject()
  output.add('upload_seq', upload_result.upload_seq)
  output.add('url', upload_result.file_url)
  output.add('file_path', upload_result.file_path)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/file/zip(/:encoding)?', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  await checkMachine(req)

  const operation_seq = req.params.operation_seq
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

export default routes
