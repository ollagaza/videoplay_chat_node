import ServiceConfig from '../../../service/service-config'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import StdObject from '../../../wrapper/std-object'
import log from '../../../libs/logger'
import MemberInfo from '../../../wrapper/member/MemberInfo'

export default class MemberModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'member'
    this.selectable_fields = ['*']
    this.private_fields = [
      'password', 'user_media_path', 'profile_image_path', 'certkey',
      'license_no', 'license_image_path', 'special_no',
      'major', 'major_sub', 'worktype',
      'trainingcode', 'trainingname', 'universitycode', 'universityname',
      'graduation_year', 'interrest_code', 'interrest_text', 'member_seq'
    ]
    this.log_prefix = '[MemberModel]'
  }

  encryptPassword = (password) => {
    if (Util.isEmpty(password)) {
      return null
    } else {
      return Util.hash(`mt_${Util.md5(password)}_eg`)
    }
  }

  getMemberList = async (search_options = null, page_options = null) => {
    let filter = search_options
    const member_list = []
    const query_result = await this.find(filter)
    if (query_result) {
      for (let i = 0; i < query_result.length; i++) {
        member_list.push(new MemberInfo(query_result[i], this.private_fields))
      }
    }
    return member_list
  }

  getMemberInfo = async (member_seq) => {
    const query_result = await this.findOne({ seq: member_seq }, null, { name: 'seq', direction: 'desc' })
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime())
    }
    return new MemberInfo(query_result, this.private_fields)
  }

  getMemberInfoById = async (user_id) => {
    const query_result = await this.findOne({ 'user_id': user_id })
    if (query_result && query_result.regist_date) {
      query_result.regist_date = Util.dateFormat(query_result.regist_date.getTime())
    }
    return new MemberInfo(query_result, this.private_fields)
  }

  createMember = async (member_info, is_confirm = false) => {
    member_info.setAutoTrim(true)
    const member = member_info.toJSON()

    if (is_confirm) {
      member.used = 1
    }
    member.password = this.encryptPassword(member_info.password)
    member.user_media_path = `/user/${member.user_id}`

    const media_root = ServiceConfig.get('media_root')

    if (!(await Util.fileExists(media_root + member.user_media_path))) {
      await Util.createDirectory(media_root + member.user_media_path)
    }

    const member_seq = await this.create(member, 'seq')
    member_info.addKey('seq')
    member_info.seq = member_seq

    return member_info
  }

  modifyMember = async (member_seq, member_info) => {
    member_info.setIgnoreEmpty(true)
    member_info.setAutoTrim(true)
    if (member_info.password) {
      member_info.password = this.encryptPassword(member_info.password)
    }
    const member = member_info.toJSON()
    log.debug(this.log_prefix, member)
    const result = await this.update({ seq: member_seq }, member)

    return result
  }

  findMembers = async (searchText, searchOrder = null) => {
    const find_user_results = await this.findPaginated(searchText, null, searchOrder, null, searchText.page_navigation)
    if (!find_user_results.data || find_user_results.data.length === 0) {
      return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    return find_user_results
  }

  findMemberId = async (member_info) => {
    member_info.setAutoTrim(true)
    const member = member_info.toJSON()
    const find_user_result = await this.findOne({ user_name: member.user_name, email_address: member.email_address })

    if (!find_user_result || !find_user_result.seq) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    return new MemberInfo(find_user_result)
  }

  findMemberInfo = async (member_info) => {
    member_info.setAutoTrim(true)
    const member = member_info.toJSON()
    const find_user_result = await this.findOne({
      user_id: member.user_id,
      user_name: member.user_name,
      email_address: member.email_address
    })
    if (!find_user_result || !find_user_result.seq) {
      throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
    }
    return new MemberInfo(find_user_result)
  }

  updateTempPassword = async (member_seq, temp_password) => {
    return await this.update({ seq: member_seq }, { password: this.encryptPassword(temp_password) })
  }

  changePassword = async (member_seq, new_password) => {
    return await this.update({ seq: member_seq }, { password: this.encryptPassword(new_password) })
  }

  upgradePassword = async (member_seq, new_password) => {
    return await this.update({ seq: member_seq }, {
      password: this.encryptPassword(new_password),
      'modify_date': this.database.raw('NOW()')
    })
  }

  updateLastLogin = async (member_seq) => {
    return await this.update({ seq: member_seq }, { 'lastlogin': this.database.raw('NOW()') })
  }

  isDuplicateId = async (user_id) => {
    const where = { 'user_id': user_id }
    const total_count = await this.getTotalCount(where)

    return total_count > 0
  }

  isDuplicateNickname = async (nickname) => {
    const where = { 'user_nickname': nickname }
    const total_count = await this.getTotalCount(where)

    return total_count > 0
  }

  isDuplicateEmail = async (email_address) => {
    const query = this.database.select([ this.database.raw('COUNT(*) AS total_count') ])
    query.from(this.table_name)
    query.where('email_address', email_address)
    query.andWhere('used', '!=', 3)
    query.first()
    const result = await query
    return result && result.total_count > 0
  }

  leaveMember = async (member_seq) => {
    const update_info = {
      'used': '3',
      'modify_date': this.database.raw('NOW()'),
      'admin_code': this.database.raw('NULL'),
    }
    const result = await this.update({ seq: member_seq }, update_info)
    return result
  }

  getCertCount = async (cert) => {
    const where = { 'certkey': cert }
    const total_count = await this.getTotalCount(where)

    return total_count > 0
  }

  setPauseMemberReset = async () => {
    return this.database.raw('UPDATE member SET used = 1, stop_end_date = null, admin_code = 1 WHERE used = 5 AND date_format(stop_end_date, \'%Y-%m-%d\') <= now()')
  }
}
