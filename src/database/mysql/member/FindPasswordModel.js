import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'

export default class FindPasswordModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'find_pw'
    this.selectable_fields = ['*']
    this.log_prefix = '[FindPasswordModel]'
  }

  createAuthInfo = async (member_seq, member_email, expire_time) => {
    const send_code = Util.getRandomNumber(6)
    const check_code = Util.getRandomString(6)

    const params = {
      'member_seq': member_seq,
      'send_code': send_code,
      'check_code': check_code,
      'email_address': member_email,
      'expire_time': expire_time
    }

    const seq = await this.create(params)
    params.seq = seq
    return params
  }

  findAuthInfo = async (seq) => {
    return this.findOne({ seq })
  }

  setVerify = async (seq) => {
    return this.update({ seq }, { 'is_verify': 1, 'modify_date': this.database.raw('NOW()') })
  }

  deleteMemberAuthInfo = async (member_seq) => {
    return this.delete({ member_seq })
  }
}
