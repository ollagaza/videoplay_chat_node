import MySQLModel from '../mysql-model'
import ServiceErrorInfo from '../../wrapper/service/service-error-info'
import SendMail from '../../libs/send-mail'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'

export default class ServiceErrorModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'service_error'
    this.selectable_fields = ['*']
    this.log_prefix = '[ServiceErrorModel]'
  }

  createServiceError = async (error_type, operation_seq, content_id, message, request) => {
    const request_url = request ? request.originalUrl : null
    const request_method = request ? request.method : null
    const request_body = request ? JSON.stringify(request.body) : null
    const error_info = new ServiceErrorInfo({
      error_type,
      operation_seq,
      content_id,
      message,
      request_url,
      request_method,
      request_body
    })
    const create_info = error_info.toJSON()
    await this.create(create_info, 'seq')

    if (ServiceConfig.get('send_error_mail') === 'Y') {
      const send_mail = new SendMail()
      const mail_to = ['weather8128@gmail.com']
      const subject = '[MTEG ERROR] Api Request Error'
      let context = ''
      context += `요청 일자: ${Util.currentFormattedDate()}<br/>\n`
      if (request) {
        context += `${request_method} ${request_url}<br/><br/>\n`
      }
      context += Util.nlToBr(message)
      await send_mail.sendMailHtml(mail_to, subject, context)
    }
  }
}
