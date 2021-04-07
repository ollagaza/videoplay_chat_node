import _ from 'lodash'
import DBMySQL from '../database/knex-mysql'
import MemberModel from "../database/mysql/member/MemberModel"
import log from '../libs/logger'
import MemberInfo from "../wrapper/member/MemberInfo"

const MemberListClass = class {
  constructor () {
    this.log_prefix = '[MemberListClass]'
    this.member_list = []
  }

  load_member = async () => {
    const private_fields = [
      'password', 'user_media_path', 'certkey',
      'license_no', 'license_image_path', 'special_no',
      'major', 'major_sub', 'worktype',
      'trainingcode', 'trainingname', 'universitycode', 'universityname',
      'graduation_year', 'interrest_code', 'interrest_text', 'member_seq'
    ]
    const member_model = new MemberModel(DBMySQL)
    const db_member_list = await member_model.find()

    this.member_list = []

    for (let cnt = 0; cnt < db_member_list.length; cnt++) {
      this.member_list[`member_${db_member_list[cnt].seq}`] = JSON.parse(JSON.stringify(new MemberInfo(db_member_list[cnt], private_fields).toJSON()))
      this.member_list.length = db_member_list.length;
    }

    return true
  }

  init = async () => {
    await this.load_member()
  }

  reload = async (callback) => {
    log.debug(this.log_prefix, '[reload_member]')
    await this.load_member()
    if (callback) callback()
  }

  getAllMemberInfo = () => {
    return this.member_list
  }

  getSeq = (seq) => {
    return this.member_list[`member_${seq}`]
  }

  filter = (key, data) => {
    return _.filter(this.member_list, item => item[key] === data)
  }
}

const Member_List = new MemberListClass()

export default Member_List
