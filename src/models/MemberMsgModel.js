import ModelObject from '@/classes/ModelObject';
import StdObject from '@/classes/StdObject';
import service_config from '@/config/service.config';

export default class MemberMsgModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'meber_msg';
    this.selectable_fields = ['*'];
  }

  sendMsg = async (seq, receiver, message) => {
    const sendMsg = {
      user_seq: seq,
      receiver: receiver,
      message: message,
    };

    return await this.create(sendMsg);
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
