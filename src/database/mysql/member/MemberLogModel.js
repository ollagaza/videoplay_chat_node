import MySQLModel from '../../mysql-model'
import { LogCodeModel } from '../../mongodb/MemberLogCode';
import NotifyInfo from "../../../wrapper/common/NotifyInfo";
import Util from "../../../utils/baseutil";
import ServiceConfig from "../../../service/service-config";

export default class MemberLogModel extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'member_log'
    this.selectable_fields = ['*']
    this.log_prefix = '[MemberLogModel]'
  }

  createMemberLog = async (seq, code, text, ip, notice_page, notice_list, is_view) => {
    const memberLog = {
      member_seq: seq,
      log_code: code,
      log_text: text,
      used_ipaddress: ip,
      notice_page,
      notice_list,
      is_view,
    };

    return await this.create(memberLog, 'seq');
  };

  getNoticePageMemberLog = async (lang, seq) => {
    const memberLog = {
      member_seq: seq,
      notice_page: 1,
      notice_list: 0,
    }
    const fieldSet = ["log_code", "log_text", "date_format(regist_date, '%Y%m%d') keydate", "date_format(regist_date, '%Y%m%d%H%i') regist_date"];
    const resultContent = {};
    const logCodes = await LogCodeModel.findAll();
    const langLogCodes = logCodes[0].codes[lang];
    const result = await this.find(memberLog, fieldSet, { name: "regist_date", direction: "asc" }, null);

    Object.keys(result).forEach((key) => {
      if(langLogCodes[result[key].log_code] !== undefined) {
        if(langLogCodes[result[key].log_code].indexOf("#") !== -1) {
          result[key].log_text = langLogCodes[result[key].log_code].replace(/#.+#/g, result[key].log_text);
        } else {
          result[key].log_text = langLogCodes[result[key].log_code];
        }
      }

      if (resultContent[result[key].keydate] !== undefined) {
        resultContent[result[key].keydate][resultContent[result[key].keydate].length++] = result[key];
      } else {
        resultContent[result[key].keydate] = [result[key]];
      }
    });
    return resultContent;
  };

  getNoticeListMemberLog = async (lang, seq) => {
    const memberLog = {
      member_seq: seq,
      notice_page: 0,
      notice_list: 1,
    }
    const fieldSet = ['member_log.seq', 'member_log.log_text', 'member_log.regist_date', 'member_log.is_view', 'member.profile_image_path'];
    const resultContent = [];

    const logCodes = await LogCodeModel.findAll();
    const langLogCodes = logCodes[0].codes[lang];

    const oKnex = this.database.select(fieldSet);
    oKnex.from(this.table_name);
    oKnex.leftOuterJoin('member', 'member.seq', 'member_log.other_member_seq')
    oKnex.where(memberLog);
    const cnt_oKnex = oKnex.clone();
    cnt_oKnex.andWhere('member_log.is_view', '0')
    const count_result = await cnt_oKnex.count('* as total_count').first();
    oKnex.andWhere('member_log.regist_date', '>=', this.database.raw('date_sub(now(), interval 1 week)'));
    // oKnex.limit(5);
    oKnex.orderBy('member_log.regist_date', 'desc');
    const result = await oKnex;

    Object.keys(result).forEach((key) => {
      if(langLogCodes[result[key].log_code] !== undefined) {
        if(langLogCodes[result[key].log_code].indexOf("#") !== -1) {
          result[key].log_text = langLogCodes[result[key].log_code].replace(/#.+#/g, result[key].log_text);
        } else {
          result[key].log_text = langLogCodes[result[key].log_code];
        }
      }

      const notify_info = new NotifyInfo();
      notify_info.seq = result[key].seq;
      notify_info.text = result[key].log_text;
      notify_info.profile_image = result[key].profile_image_path ? Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), result[key].profile_image_path) : ''
      notify_info.regist_datetime = result[key].regist_date;

      resultContent.push(notify_info);
    });

    return { total_count: count_result.total_count, resultlist: resultContent.undefined ? resultContent.undefined : [] };
  };
}
