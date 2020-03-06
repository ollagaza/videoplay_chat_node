import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberLogModel from '../../database/mysql/member/MemberLogModel';

const MemberLogServiceClass = class {
  constructor () {
    this.log_prefix = '[MemberLogServiceClass]'
  }

  getMemberLogModel = (database = null) => {
    if (database) {
      return new MemberLogModel(database)
    }
    return new MemberLogModel(DBMySQL)
  }

  createMemberLog = async (database, member_seq, code, text = "") => {
    const member_log_model = this.getMemberLogModel(database)
    return member_log_model.createMemberLog(member_seq, code, text)
  }

  memberJoinLog = async (database, member_seq) => {
    try {
      await this.createMemberLog(database, member_seq, "1000")
      await this.createMemberLog(database, member_seq, "1001", 300)
      await this.createMemberLog(database, member_seq, "8000")
    } catch (error) {
      log.error(this.log_prefix, '[memberJoinLog]', error)
    }
  }

  memberModifyLog = async (database, member_seq) => {
    try {
      await this.createMemberLog(database, member_seq, "1002")
    } catch (error) {
      log.error(this.log_prefix, '[memberModifyLog]', error)
    }
  }

  memberLeaveLog = async (database, member_seq, leave_text) => {
    try {
      await this.createMemberLog(database, member_seq, "9999", leave_text)
    } catch (error) {
      log.error(this.log_prefix, '[memberLeaveLog]', error)
    }
  }

  getMemberLog = async (database, member_seq, lang = 'kor') => {
    const member_log_model = this.getMemberLogModel(database)
    return await member_log_model.getMemberLog(lang, member_seq)
  }
}

const member_log_service = new MemberLogServiceClass()

export default member_log_service
