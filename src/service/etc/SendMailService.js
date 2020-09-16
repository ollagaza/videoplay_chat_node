import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import SendMail from '../../libs/send-mail'
import SendMailModel from '../../database/mysql/etc/SendMailModel'

const SendMailServiceClass = class {
  constructor () {
    this.log_prefix = '[ContactUsService]'
  }

  getSendMailModel = (database = null) => {
    if (database) {
      return new SendMailModel(database)
    }
    return new SendMailModel(DBMySQL)
  }

  createSendMail = async (sendmail_data) => {
    const sendmail_model = this.getSendMailModel()
    const create_result = await sendmail_model.createSendMail(sendmail_data)
    if (!create_result) {
      throw new StdObject(-1, '전송할 메일이 기록되지 않았습니다.', 400)
    }

    (
      async () => {
        const email_list = sendmail_data.email_list
        if (!email_list || email_list.length <= 0) {
          return
        }
        let body = sendmail_data.email_desc
        try {
          await new SendMail().sendMailText(JSON.parse(email_list), sendmail_data.email_title, body)
        } catch (e) {
          log.error(this.log_prefix, 'send email', email_list, e)
        }
      }
    )()

    return create_result > 0
  }
}

const SendMail_Service = new SendMailServiceClass()

export default SendMail_Service
