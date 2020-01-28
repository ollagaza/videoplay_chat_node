import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberModel from '../../database/mysql/member/MemberModel';
import MemberSubModel from '../../database/mysql/member/MemberSubModel';
import MemberLogModel from '../../database/mysql/member/MemberLogModel';
import FindPasswordModel from '../../database/mysql/member/FindPasswordModel';
import { UserDataModel } from '../../database/mongodb/UserData';
import MemberInfo from "../../wrapper/member/MemberInfo";
import MemberInfoSub from "../../wrapper/member/MemberInfoSub";
import MemberTemplate from '../../template/mail/member.template';

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
