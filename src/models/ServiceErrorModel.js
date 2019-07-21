import ModelObject from '@/classes/ModelObject';
import ServiceErrorInfo from '@/classes/surgbook/ServiceErrorInfo';
import SendMail from '@/classes/SendMail';
import Util from '@/utils/baseutil';
import service_config from '@/config/service.config';

export default class ServiceErrorModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'service_error';
    this.selectable_fields = ['*'];
  }

  createServiceError = async (error_type, operation_seq, content_id, message, req) => {
    const error_info = new ServiceErrorInfo({ error_type, operation_seq, content_id, message });
    const create_info = error_info.toJSON();
    await this.create(create_info, 'seq');

    if (service_config.get('send_error_mail') === 'Y') {
      const send_mail = new SendMail();
      const mail_to = ["weather8128@gmail.com"];
      const subject = "[MTEG ERROR] Api Request Error";
      let context = '';
      context += `요청 일자: ${Util.currentFormattedDate()}<br/>\n`;
      if (req) {
        context += `${req.method} ${req.originalUrl}<br/><br/>\n`;
      }
      context += Util.nlToBr(message);
      await send_mail.sendMailHtml(mail_to, subject, context);
    }
  };
}
