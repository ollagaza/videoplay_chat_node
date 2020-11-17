import { Router } from 'express'
import log from '../../libs/logger'
import Wrap from '../../utils/express-async'
import Util from '../../utils/baseutil'
import baseutil from '../../utils/baseutil'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import AdminMemberService from '../../service/member/AdminMemberService'
import service_config from '../../service/service-config'
import MemberInfo from '../../wrapper/member/MemberInfo'
import MemberInfoSub from '../../wrapper/member/MemberInfoSub'
import MemberService from '../../service/member/MemberService'
import _ from 'lodash'
import MongoDataService from '../../service/common/MongoDataService'

const routes = Router()

routes.get('/me', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const lang = Auth.getLanguage(req)
  const token_info = req.token_info
  const member_seq = token_info.getId()
  const member_info = await AdminMemberService.getMemberInfoWithSub(DBMySQL, member_seq, lang)

  const output = new StdObject()
  output.add('member_info', member_info.member_info)
  output.add('member_sub_info', member_info.member_sub_info)

  res.json(output)
}))

routes.post('/getMem', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = req.body.member_seq
  const lang = 'kor'

  if (!token_info) {
    throw new StdObject(-1, '잘못된 요청입니다.', 403)
  }

  // const member_info = await MemberService.getMemberInfo(member_seq);
  const member_info = await MemberService.getMemberInfoWithSub(DBMySQL, member_seq, lang)
  const output = new StdObject()
  output.add('member_info', member_info.member_info)
  output.add('member_sub_info', member_info.member_sub_info)
  res.json(output)
}))

routes.post('/memberlist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const searchParam = req.body.searchObj
  const searchOrder = req.body.searchOrder
  const page_navigation = req.body.page_navigation

  const find_user_info_list = await AdminMemberService.adminfindMembers(DBMySQL, searchParam, searchOrder, page_navigation)

  output.add('user_data', find_user_info_list)
  output.add('searchObj', searchParam)

  res.json(output)
}))

routes.put('/:member_seq(\\d+)', baseutil.common_path_upload.fields([{ name: 'profile_image' }, { name: 'licens_image' }]), Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = Util.parseInt(req.params.member_seq)

  const params = JSON.parse(req.body.params)

  _.forEach(req.files, (value) => {
    if (value[0].fieldname === 'profile_image') {
      params.user_info.profile_image_path = '/common/' + value[0].filename
    } else if (value[0].fieldname === 'licens_image') {
      params.user_sub_info.license_image_path = '/common/' + value[0].filename
    }
  })

  const member_info = new MemberInfo(params.user_info)
  const member_sub_info = new MemberInfoSub(params.user_sub_info)

  await DBMySQL.transaction(async (transaction) => {
    const result = await MemberService.modifyMemberWithSub(transaction, member_seq, member_info, member_sub_info)
    if (!result) {
      throw new StdObject(-1, '회원정보 수정 실패', 400)
    }
  })

  res.json(new StdObject())
}))

routes.put('/memberUsedUpdate', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  req.accepts('application/json')
  const updateData = req.body.setData
  const search_option = req.body.searchObj
  let output = new StdObject()

  await DBMySQL.transaction(async (transaction) => {
    output = await AdminMemberService.updateMemberUsedforSendMail(transaction, updateData, search_option)
  });

  (async () => {
    try {
      await AdminMemberService.sendMailforMemberChangeUsed(DBMySQL, output, output.variables.appr_code, updateData, service_config.get('service_url'), output.variables.search_option)
    } catch (e) {
      log.e(req, e)
    }
  })()

  res.json(output)
}))

routes.post('/getMembers', Wrap(async (req, res) => {
  req.accepts('application/json')
  try {
    const output = new StdObject()
    const member_seqs = req.body.member_seqs
    const seq = _.concat(['in'], member_seqs)
    const filter = {
      is_new: true,
      query: [
        { seq }
      ],
    }
    const result = await AdminMemberService.getMembers(DBMySQL, filter)
    output.add('result', result)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
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

routes.get('/member_home', Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = await AdminMemberService.getHome_Datas(DBMySQL)
  res.json(output)
}))

export default routes
