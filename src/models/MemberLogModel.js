import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import service_config from '@/config/service.config';
import {LogCodeModel} from '@/db/mongodb/model/MemberLogCode';

export default class MemberLogModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'member_log';
    this.selectable_fields = ['*'];
  }

  createMemberLog = async (seq, code, text = "") => {
    const memberLog = {
      user_seq: seq,
      log_code: code,
      log_text: text,
    };

    return await this.create(memberLog);
  };

  getMemberLog = async (seq) => {
    const memberLog = {
      user_seq: seq,
    }
    const fieldSet = ["log_code", "log_text", "date_format(regist_date, '%Y%m%d') keydate", "date_format(regist_date, '%Y%m%d%H%i') regist_date"];
    const resultContent = {};
    const logCodes = await LogCodeModel.findAll();
    const result = await this.find(memberLog, fieldSet, { name: "regist_date", direction: "asc" }, null);

    Object.keys(result).forEach((key) => {
      if(logCodes[0].codes[result[key].log_code] !== undefined) {
        if(logCodes[0].codes[result[key].log_code].indexOf("#") !== -1) {
          result[key].log_text = logCodes[0].codes[result[key].log_code].replace(/#.+#/g, result[key].log_text);
        } else {
          result[key].log_text = logCodes[0].codes[result[key].log_code];
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
