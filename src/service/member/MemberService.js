import _ from 'lodash'
import ServiceConfig from '../../service/service-config'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import GroupService from '../group/GroupService'
import MemberLogService from './MemberLogService'
import PaymentService from '../payment/PaymentService'
import MemberModel from '../../database/mysql/member/MemberModel'
import MemberSubModel from '../../database/mysql/member/MemberSubModel'
import AdminMemberModel from '../../database/mysql/member/AdminMemberModel'
import FindPasswordModel from '../../database/mysql/member/FindPasswordModel'
import {UserDataModel} from '../../database/mongodb/UserData'
import MemberInfo from '../../wrapper/member/MemberInfo'
import MemberTemplate from '../../template/mail/member.template'
import SendMail from '../../libs/send-mail'

const MemberServiceClass = class {
  constructor() {
    this.log_prefix = '[MemberServiceClass]'
    this.member_private_fields = ['password',
      'license_no', 'license_image_path', 'special_no',
      'major', 'major_text', 'major_sub', 'major_sub_text', 'worktype',
      'trainingcode', 'trainingname', 'universitycode', 'universityname',
      'graduation_year', 'interrest_code', 'interrest_text', 'member_seq'
    ]

    this.member_sub_private_fields = ['seq', 'regist_date', 'modify_date', 'user_id', 'password',
      'user_nickname', 'user_name', 'gender', 'email_address',
      'mail_acceptance', 'birth_day', 'cellphone', 'tel',
      'user_media_path', 'profile_image_path', 'certkey', 'used',
      'hospcode', 'hospname', 'treatcode', 'treatname',
      'etc1', 'etc2', 'etc3', 'etc4', 'etc5'
    ]
  }

  checkMyToken = (token_info, member_seq) => {
    if (token_info.getId() !== member_seq) {
      if (!token_info.isAdmin()) {
        return false
      }
    }
    return true
  }

  getMemberModel = (database = null) => {
    if (database) {
      return new MemberModel(database)
    }
    return new MemberModel(DBMySQL)
  }

  getMemberSubModel = (database = null) => {
    if (database) {
      return new MemberSubModel(database)
    }
    return new MemberSubModel(DBMySQL)
  }

  getAdminMemberModel = (database = null) => {
    if (database) {
      return new AdminMemberModel(database)
    }
    return new AdminMemberModel(DBMySQL)
  }

  getMemberInfo = async (database, member_seq) => {
    const {member_info} = await this.getMemberInfoWithModel(database, member_seq)
    return member_info
  }

  isActiveMember = (member_info) => {
    if (!member_info || member_info.isEmpty() || !member_info.seq) {
      return false
    }
    return Util.parseInt(member_info.used, 0) === 1
  }

  getMemberStateError = (member_info) => {
    const output = new StdObject()
    if (this.isActiveMember(member_info)) {
      output.error = -1
      output.message = '등록된 회원이 아닙니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 0) {
      output.error = -2
      output.message = '회원가입 승인이 완료되지 않았습니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 2) {
      output.error = -3
      output.message = '탈퇴처리된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 3) {
      output.error = -4
      output.message = '휴면처리된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 4) {
      output.error = -5
      output.message = '사용중지된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 5) {
      output.error = -6
      output.message = '사용제제된 계정입니다.'
      output.httpStatusCode = 403
    }
    return output
  }

  getMemberInfoWithModel = async (database, member_seq) => {
    const member_model = this.getMemberModel(database)
    const member_info = await member_model.getMemberInfo(member_seq)
    if (member_info.isEmpty() || !member_info.seq) {
      throw new StdObject(-1, '회원정보가 존재하지 않습니다.', 400)
    }
    if (!member_info.isEmpty() && !Util.isEmpty(member_info.profile_image_path)) {
      member_info.addKey('profile_image_url')
      member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), member_info.profile_image_path)
    }

    return {
      member_model,
      member_info
    }
  }

  chkCert = async (database, cert) => {
    const member_model = this.getMemberModel(database)
    const result = await member_model.getCertCount(cert)
    const output = new StdObject()
    output.add('result', result)
    return output
  }

  getMemberInfoById = async (database, user_id) => {
    const member_model = this.getMemberModel(database)
    return await member_model.getMemberInfoById(user_id)
  }

  getMemberSubInfo = async (database, member_seq, lang = 'kor') => {
    const member_sub_model = this.getMemberSubModel(database)
    return await member_sub_model.getMemberSubInfo(member_seq, lang)
  }

  getMemberInfoWithSub = async (database, member_seq, lang = 'kor') => {
    const member_info = await this.getMemberInfo(database, member_seq)
    const member_sub_info = await this.getMemberSubInfo(database, member_seq, lang)

    return {
      member_info,
      member_sub_info
    }
  }

  getMemberInfoByToken = async (database, token_info) => {
    return await this.getMemberInfo(database, token_info.getId())
  }

  modifyMemberInfo = async (database, member_seq, member_info, add_log = true) => {
    const member_model = this.getMemberModel(database)
    const modify_result = await member_model.modifyMember(member_seq, member_info)

    if (add_log) {
      await MemberLogService.memberModifyLog(database, member_seq)
    }

    return modify_result
  }

  modifyMemberSubInfo = async (database, member_seq, member_sub_info) => {
    const member_sub_model = this.getMemberSubModel(database)
    return await member_sub_model.modifyMember(member_seq, member_sub_info)
  }

  modifyMemberWithSub = async (database, member_seq, member_info, member_sub_info) => {
    const update_member_result = await this.modifyMemberInfo(database, member_seq, member_info, false)
    const update_member_sub_result = await this.modifyMemberSubInfo(database, member_seq, member_sub_info)

    await MemberLogService.memberModifyLog(database, member_seq)

    return update_member_result & update_member_sub_result
  }

  checkPassword = async (database, member_info, password, db_update = true) => {
    const member_model = this.getMemberModel(database)
    if (member_info.password !== member_model.encryptPassword(password)) {
      throw new StdObject(-1, '회원정보가 일치하지 않습니다.', 400)
    }
    if (db_update) {
      await member_model.updateLastLogin(member_info.seq)
    }
  }

  changePassword = async (database, member_seq, request_body, is_admin = false) => {
    const {member_info, member_model} = await this.getMemberInfoWithModel(database, member_seq)
    if (!member_info || member_info.isEmpty()) {
      throw new StdObject(100, '등록된 회원이 아닙니다.', 400)
    }
    if (!request_body.is_admin_modify && !is_admin) {
      if (Util.trim(request_body.old_password) === '') {
        throw new StdObject(-1, '잘못된 요청입니다.', 400)
      }

      if (request_body.password !== request_body.password_confirm) {
        throw new StdObject(-1, '입력한 비밀번호가 일치하지 않습니다.', 400)
      }

      await this.checkPassword(database, member_info, request_body.old_password, false)
    }
    await member_model.changePassword(member_seq, request_body.password)
    return true
  }

  findMemberId = async (database, request_body) => {
    const member_info = new MemberInfo(request_body)
    member_info.setKeys(['user_name', 'email_address'])
    member_info.checkUserName()
    member_info.checkEmailAddress()

    const output = new StdObject()

    const member_model = this.getMemberModel(database)
    const find_member_info = await member_model.findMemberId(member_info)
    if (find_member_info && find_member_info.seq) {
      output.add('user_id', find_member_info.user_id)
      output.add('user_name', find_member_info.user_name)
      output.add('email_address', find_member_info.email_address)
      output.add('is_find', true)
    } else {
      output.add('is_find', false)
    }

    return output
  }

  sendAuthCode = async (database, request_body) => {
    const member_info = new MemberInfo(request_body)
    member_info.setKeys(['user_name', 'email_address', 'user_id'])
    member_info.checkUserId()
    member_info.checkUserName()
    member_info.checkEmailAddress()

    const output = new StdObject()

    const member_model = this.getMemberModel(database)
    const find_member_info = await member_model.findMemberId(member_info)

    if (find_member_info && find_member_info.seq) {
      const remain_time = 600
      const expire_time = Math.floor(Date.now() / 1000) + remain_time

      const auth_info = await new FindPasswordModel(database).createAuthInfo(find_member_info.seq, find_member_info.email_address, expire_time)
      output.add('seq', auth_info.seq)
      output.add('check_code', auth_info.check_code)
      output.add('remain_time', remain_time)

      const template_data = {
        'user_name': find_member_info.user_name,
        'user_id': find_member_info.user_id,
        'email_address': find_member_info.email_address,
        'send_code': auth_info.send_code,
        'url_prefix': request_body.url_prefix,
        'request_domain': request_body.request_domain
      }

      const send_mail_result = await new SendMail().sendMailHtml([find_member_info.email_address], 'Surgstory 비밀번호 인증코드 입니다.', MemberTemplate.findUserInfo(template_data))
      if (send_mail_result.isSuccess() === false) {
        throw send_mail_result
      }

      output.add('is_send', true)
    } else {
      output.add('is_send', false)
    }

    return output
  }

  checkAuthCode = async (database, request_body) => {
    const find_password_model = new FindPasswordModel(database)
    const auth_info = await find_password_model.findAuthInfo(request_body.seq)
    if (!auth_info) {
      throw new StdObject(-1, '인증정보를 찾을 수 없습니다.', 400)
    }
    if (auth_info.send_code === request_body.send_code && auth_info.check_code === request_body.check_code) {
      await find_password_model.setVerify(request_body.seq)
    } else {
      throw new StdObject(-1, '인증코드가 일치하지 않습니다.', 400)
    }
    const output = new StdObject()
    output.add('is_verify', true)
    return output
  }

  resetPassword = async (database, request_body) => {
    if (request_body.password !== request_body.password_confirm) {
      throw new StdObject(-1, '입력한 비밀번호가 일치하지 않습니다.', 400)
    }
    const find_password_model = new FindPasswordModel(database)
    const auth_info = await find_password_model.findAuthInfo(request_body.seq)
    if (!auth_info) {
      throw new StdObject(-1, '인증정보를 찾을 수 없습니다.', 400)
    }
    if (auth_info.is_verify === 1) {
      const member_model = this.getMemberModel(database)
      await member_model.changePassword(auth_info.member_seq, request_body.password)
    } else {
      throw new StdObject(-2, '인증정보가 존재하지 않습니다.', 400)
    }
    const output = new StdObject()
    output.add('is_change', true)
    return output
  }

  isDuplicateId = async (database, user_id) => {
    const member_model = this.getMemberModel(database)
    return await member_model.isDuplicateId(user_id)
  }

  isDuplicateNickname = async (database, user_id) => {
    const member_model = this.getMemberModel(database)
    return await member_model.isDuplicateNickname(user_id)
  }

  isDuplicateEmail = async (database, email_address) => {
    const member_model = this.getMemberModel(database)
    return await member_model.isDuplicateEmail(email_address)
  }

  isDuplicatelicense_no = async (database, license_no) => {
    const member_model = this.getMemberSubModel(database)
    return await member_model.isDuplicateLicense_no(license_no)
  }

  getMemberMetadata = async (member_seq) => {
    let user_data = await UserDataModel.findByMemberSeq(member_seq, '-_id -member_seq -created_date -modify_date')
    if (!user_data) {
      user_data = await UserDataModel.createUserData(member_seq, {})
    }
    return user_data
  }

  updateMemberMetadata = async (member_seq, changes) => {
    return await UserDataModel.updateByMemberSeq(member_seq, changes)
  }

  leaveMember = async (database, member_seq, leave_text) => {
    const member_model = this.getMemberModel(database)
    await member_model.leaveMember(member_seq)
    await MemberLogService.memberLeaveLog(database, member_seq, leave_text)
  }

  findMembers = async (database, params, page_navigation = null) => {
    const searchObj = {
      is_new: true,
      query: [],
      page_navigation: page_navigation,
    }
    _.forEach(params, (value, key) => {
      searchObj.query[key] = value
    })

    log.debug(this.log_prefix, searchObj.query)

    const member_model = this.getMemberModel(database)
    const member_sub_model = this.getMemberSubModel(database)
    const find_users = await member_model.findMembers(searchObj)

    searchObj.query = []
    searchObj.query = [{member_seq: _.concat('in', _.map(find_users.data, 'seq'))}]

    const find_sub_users = await member_sub_model.findMembers(searchObj)
    const res = []
    _.keyBy(find_users.data, data => {
      if (_.find(find_sub_users, {member_seq: data.seq})) {
        res.push(_.merge(data, _.find(find_sub_users, {member_seq: data.seq})))
      } else {
        res.push(_.merge(data))
      }
    })
    find_users.data = new MemberInfo(res)
    return find_users
  }

  getMemberList = async (database, search_option = null) => {
    const member_model = this.getMemberModel(database)
    const member_list = await member_model.getMemberList(search_option)
    return member_list
  }

  createMember = async (database, params, is_auto_confirm = false) => {
    const member_info = new MemberInfo(params.user_info, ['password_confirm'])
    const member_sub_info = new MemberInfo(params.user_sub_info)
    let create_member_info = null
    let group_info = null

    member_info.checkDefaultParams()
    member_info.checkUserId()
    member_info.checkPassword()
    member_info.checkUserName()
    member_info.checkUserNickname()
    // member_info.checkEmailAddress();

    let is_confirm = is_auto_confirm
    if (ServiceConfig.isVacs()) {
      is_confirm = true
    }

    await DBMySQL.transaction(async (transaction) => {

      const member_model = this.getMemberModel(database)
      create_member_info = await member_model.createMember(member_info, is_confirm)
      if (!create_member_info.seq) {
        throw new StdObject(-1, '회원정보 생성 실패', 500)
      }

      await this.modifyMemberSubInfo(database, create_member_info.seq, member_sub_info)
      await MemberLogService.memberJoinLog(database, create_member_info.seq)

      const search_keyword = {}
      const group_explain = member_info.foreigner === 'Y' ? `Welcome! This is ${member_info.user_nickname}'s channel.` : `안녕하세요. ${member_info.user_nickname} 채널입니다.`

      _.forEach(JSON.parse(member_info.treatcode), async (item, index) => {
        search_keyword[index] = item.text
      })

      const options = {
        pay_code: 'f_12TB',
        storage_size: 12 * 1024 * 1024 * 1024 * 1024,
        is_set_group_name: 1,
        search_keyword,
        group_explain,
      };
      // group_info = await GroupService.createPersonalGroup(database, create_member_info)
      group_info = await GroupService.createEnterpriseGroup(database, create_member_info, options)
      await PaymentService.createDefaultPaymentResult(database, params.payData, create_member_info.seq, group_info)
    })

    if (ServiceConfig.isVacs() === false && ServiceConfig.supporterEmailList()) {
      (
        async () => {
          let body = ''
          body += `병원명: ${create_member_info.hospname}\n`
          body += `이름: ${create_member_info.user_name}\n`
          body += `아이디: ${create_member_info.user_id}\n`
          body += `닉네임: ${create_member_info.user_nickname}\n`
          body += `이메일: ${create_member_info.email_address}\n`
          body += `연락처: ${create_member_info.cellphone}\n`
          body += `가입일자: ${Util.currentFormattedDate()}\n`
          try {
            await new SendMail().sendMailText(ServiceConfig.supporterEmailList(), 'Surgstory.com 회원가입.', body)
          } catch (e) {
            log.error(this.log_prefix, '', e)
          }
        }
      )()
    }

    return member_info
  }

  noCheckCreateMember = async (database, params) => {
    const member_info = new MemberInfo(params.user_info, ['password_confirm'])
    const member_sub_info = new MemberInfo(params.user_sub_info)
    const member_model = this.getMemberModel(database)
    const create_member_info = await member_model.createMember(member_info, true)
    if (!create_member_info.seq) {
      throw new StdObject(-1, '회원정보 생성 실패', 500)
    }

    const update_member_sub_result = await this.modifyMemberSubInfo(database, create_member_info.seq, member_sub_info)

    await PaymentService.createDefaultPaymentResult(database, params.payData, create_member_info.seq)
    await MemberLogService.memberJoinLog(database, create_member_info.seq)
    await GroupService.createPersonalGroup(database, create_member_info)

    return member_info
  }
}

const member_service = new MemberServiceClass()

export default member_service
