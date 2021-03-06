import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Util from '../../utils/Util'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import MemberService from '../../service/member/MemberService'
import MongoDataService from '../../service/common/MongoDataService'
import MemberInfo from '../../wrapper/member/MemberInfo'
import MemberInfoSub from '../../wrapper/member/MemberInfoSub'
import log from '../../libs/logger'
import _ from 'lodash'
import GroupService from '../../service/group/GroupService'
import Member_List from "../../service/member_list";

const routes = Router()

routes.get('/me', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const lang = Auth.getLanguage(req)
  const token_info = req.token_info
  const member_seq = token_info.getId()
  const group_seq = token_info.getGroupSeq()
  const member_info = await MemberService.getMemberInfoWithSub(DBMySQL, member_seq, lang)

  const output = new StdObject()
  output.add('member_info', member_info.member_info)
  output.add('member_sub_info', member_info.member_sub_info)

  if (group_seq !== null) {
    const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq)
    output.add('group_info', group_info)
  }

  res.json(output)
}))

routes.post('/check_cert', Wrap(async (req, res) => {
  req.accepts('application/json')
  const inputCert = req.body.cert
  const output = await MemberService.chkCert(DBMySQL, inputCert)

  res.json(output)
}))

routes.get('/:member_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)

  if (token_info.getId() !== member_seq) {
    if (token_info.getRole() === Role.MEMBER) {
      throw new StdObject(-1, '잘못된 요청입니다.', 403)
    }
  }

  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
  const output = new StdObject()
  output.add('member_info', member_info)
  res.json(output)
}))

routes.post('/', Util.common_path_upload.fields([{ name: 'profile_image' }, { name: 'license_image' }]), Wrap(async (req, res) => {
  const output = new StdObject()
  const params = JSON.parse(req.body.params)

  _.forEach(req.files, (value) => {
    if (value[0].fieldname === 'profile_image') {
      params.user_info.profile_image_path = '/common/' + value[0].filename
    } else if (value[0].fieldname === 'license_image') {
      params.user_sub_info.license_image_path = '/common/' + value[0].filename
    }
  })

  if (params.user_info.delete_profile_image) {
    params.user_info.profile_image_path = '';
  }
  delete params.user_info.delete_profile_image;

  const result = await MemberService.createMember(DBMySQL, params)
  output.add('info', result)

  res.json(output)
}))

routes.post('/noCheckCreate', Util.common_path_upload.fields([{ name: 'profile_image' }, { name: 'licens_image' }]), Wrap(async (req, res) => {
  const output = new StdObject()
  const params = JSON.parse(req.body.params)

  _.forEach(req.files, (value) => {
    if (value[0].fieldname === 'profile_image') {
      params.user_info.profile_image_path = '/common/' + value[0].filename
    } else if (value[0].fieldname === 'licens_image') {
      params.user_sub_info.license_image_path = '/common/' + value[0].filename
    }
  })

  // 커밋과 롤백은 자동임
  await DBMySQL.transaction(async (transaction) => {
    const result = await MemberService.noCheckCreateMember(transaction, params)
    output.add('info', result)
  })

  res.json(output)
}))

routes.put('/:member_seq(\\d+)', Util.common_path_upload.fields([{ name: 'profile_image' }, { name: 'licens_image' }]), Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)
  const params = JSON.parse(req.body.params)
  const group_seq = token_info.getGroupSeq()

  if (!params.is_admin_modify && !MemberService.checkMyToken(token_info, member_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  _.forEach(req.files, (value) => {
    if (value[0].fieldname === 'profile_image') {
      params.user_info.profile_image_path = '/common/' + value[0].filename
    } else if (value[0].fieldname === 'licens_image') {
      params.user_sub_info.license_image_path = '/common/' + value[0].filename
    }
  })

  if (params.user_info.delete_profile_image) {
    params.user_info.profile_image_path = '';
  }
  delete params.user_info.delete_profile_image;

  const member_info = new MemberInfo(params.user_info)
  const member_sub_info = new MemberInfoSub(params.user_sub_info)

  member_info.checkUserNickname()
  // member_info.checkEmailAddress()

  await DBMySQL.transaction(async (transaction) => {
    const result = await MemberService.modifyMemberWithSub(transaction, member_seq, member_info, member_sub_info)

    if (!result) {
      throw new StdObject(-1, '회원정보 수정 실패', 400)
    }
  })

  // 병원정보를 사용하는 부분이 없으므로 주석처리
  // const update_operation_hospital = await OperationDataService.changeGroupHospital(DBMySQL, group_info.seq, member_info.hospname)

  res.json(new StdObject())
}))

routes.put('/change_password/:member_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')

  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)

  if (!MemberService.checkMyToken(token_info, member_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  const output = new StdObject()
  const is_change = await MemberService.changePassword(DBMySQL, member_seq, req.body, token_info.isAdmin())
  output.add('is_change', is_change)
  res.json(output)
}))

routes.post('/find/id', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.findMemberId(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/send_auth_code', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.sendAuthCode(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/check_auth_code', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.checkAuthCode(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/reset_password', Wrap(async (req, res) => {
  req.accepts('application/json')

  const output = await MemberService.resetPassword(DBMySQL, req.body)
  res.json(output)
}))

routes.post('/verify/user_id', Wrap(async (req, res) => {
  req.accepts('application/json')
  const user_id = req.body.user_id
  const is_duplicate = await MemberService.isDuplicateId(DBMySQL, user_id)

  const output = new StdObject()
  output.add('is_verify', !is_duplicate)

  res.json(output)
}))

routes.post('/verify/nickname', Wrap(async (req, res) => {
  req.accepts('application/json')
  const nickname = req.body.nickname
  const is_duplicate = await MemberService.isDuplicateNickname(DBMySQL, nickname)

  const output = new StdObject()
  output.add('is_verify', !is_duplicate)

  res.json(output)
}))

routes.post('/verify/email_address', Wrap(async (req, res) => {
  req.accepts('application/json')
  const email_address = req.body.email_address
  const is_duplicate = await MemberService.isDuplicateEmail(DBMySQL, email_address)

  const output = new StdObject()
  output.add('is_verify', !is_duplicate)

  res.json(output)
}))

routes.post('/verify/license_no', Wrap(async (req, res) => {
  req.accepts('application/json')
  const license_no = req.body.license_no
  const is_duplicate = await MemberService.isDuplicatelicense_no(DBMySQL, license_no)

  const output = new StdObject()
  output.add('is_verify', !is_duplicate)

  res.json(output)
}))

routes.get('/:member_seq(\\d+)/data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)
  if (!MemberService.checkMyToken(token_info, member_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  const user_data = await MemberService.getMemberMetadata(member_seq)

  const output = new StdObject()
  output.add('user_data', user_data)
  res.json(output)
}))

routes.put('/:member_seq(\\d+)/data', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)
  if (!MemberService.checkMyToken(token_info, member_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  const user_data = await MemberService.updateMemberMetadata(member_seq, req.body.changes)

  const output = new StdObject()
  output.add('user_data', user_data)
  res.json(output)
}))

routes.put('/Leave/:member_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')

  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)
  const leave_text = req.body.leaveText

  if (!MemberService.checkMyToken(token_info, member_seq)) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  await MemberService.leaveMember(DBMySQL, member_seq, leave_text)

  res.json(new StdObject())
}))

routes.post('/finds', Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const search_text = req.body.searchText
  const page_navigation = req.body.page_navigation

  const find_user_info_list = await MemberService.findMembers(DBMySQL, search_text, page_navigation)
  output.add('user_data', find_user_info_list)
  output.add('searchText', search_text)

  res.json(output)
}))

routes.post('/getMongoData', Wrap(async (req, res) => {
  req.accepts('application/json')
  const getDataParam = req.body.getData
  const getLangParam = req.body.getLang
  let output = null
  try {
    output = await MongoDataService.getData(getDataParam, getLangParam)
  } catch (exception) {
    output = new StdObject(-1, exception.message, 400)
  }
  res.json(output)
}))

routes.post('/userProfileInfo', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  try {
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.get('/getmemberinfowithcache', Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  output.adds(Member_List.getAllMemberInfo())
  output.add('member_10', Member_List.getSeq(10))
  res.json(output)
}))

export default routes
