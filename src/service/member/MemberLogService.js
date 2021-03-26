import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import MemberLogModel from '../../database/mysql/member/MemberLogModel'
import GroupService from '../group/GroupService'

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

  createMemberLog = async (
    database,
    group_seq = null, member_seq = null, other_member_seq = null,
    code = '0000', text = '', ip = null,
    notice_page = 0, notice_list = 0, is_view = 0) => {
    let member_info = null
    if (group_seq === null) {
      member_info = await GroupService.getMemberSeqbyPersonalGroupInfo(DBMySQL, group_seq)
      group_seq = member_info.seq
    } else if (member_seq === null) {
      member_info = await GroupService.getGroupSeqByMemberInfo(DBMySQL, group_seq)
      member_seq = member_info.seq
    }
    const member_log_model = this.getMemberLogModel(database)
    return member_log_model.createMemberLog(group_seq, member_seq, other_member_seq, code, text, ip, notice_page, notice_list, is_view)
  }

  memberJoinLog = async (database, member_seq) => {
    try {
      await this.createMemberLog(database, null, member_seq, null, '8000', '', null, 1)
      await this.createMemberLog(database, null, member_seq, null, '1000', '', null, 1)
    } catch (error) {
      log.error(this.log_prefix, '[memberJoinLog]', error)
    }
  }

  memberModifyLog = async (database, member_seq) => {
    try {
      await this.createMemberLog(database, null, member_seq, null, '1002', '', null, 1)
    } catch (error) {
      log.error(this.log_prefix, '[memberModifyLog]', error)
    }
  }

  memberLeaveLog = async (database, member_seq, leave_text) => {
    try {
      await this.createMemberLog(database, null, member_seq, null, '9999', leave_text, null, 1)
    } catch (error) {
      log.error(this.log_prefix, '[memberLeaveLog]', error)
    }
  }

  getNoticePageMemberLog = async (database, group_seq, member_seq, lang = 'kor') => {
    const member_log_model = this.getMemberLogModel(database)
    return await member_log_model.getNoticePageMemberLog(lang, group_seq, member_seq)
  }

  getNoticeListMemberLog = async (database, member_seq, lang = 'kor') => {
    const member_log_model = this.getMemberLogModel(database)
    return await member_log_model.getNoticeListMemberLog(lang, member_seq)
  }

  getMemberNoticeAllCountWhitMemberSeq = async (database, member_seq) => {
    const member_log_model = this.getMemberLogModel(database)
    return await member_log_model.getMemberNoticeAllCountWhitMemberSeq(member_seq);
  }
}

const member_log_service = new MemberLogServiceClass()

export default member_log_service
