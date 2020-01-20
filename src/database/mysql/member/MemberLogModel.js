import MySQLModel from '../../mysql-model'
import { LogCodeModel } from '../../mongodb/MemberLogCode';

export default class MemberLogModel extends MySQLModel {
  constructor(database) {
    super(database);

    this.table_name = 'member_log'
    this.selectable_fields = ['*']
    this.log_prefix = '[MemberLogModel]'
  }

  createMemberLog = async (seq, code, text = "") => {
    const memberLog = {
      user_seq: seq,
      log_code: code,
      log_text: text,
    };

    return await this.create(memberLog);
  };

  getMemberLog = async (lang, seq) => {
    const memberLog = {
      user_seq: seq,
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
}
