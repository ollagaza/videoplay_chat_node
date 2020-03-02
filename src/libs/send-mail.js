import nodemailer from 'nodemailer'
import _ from 'lodash'
import smtp_config from '../config/smtp.config'
import StdObject from '../wrapper/std-object'
import Config from '../config/config'
import log from './logger'

const ENV = Config.getEnv()
const IS_DEV = Config.isDev()
const mail_config = smtp_config[ENV]

export default class SendMail {
  constructor () {
    this.log_prefix = '[SendMail]'
  }

  test = async () => {
    const mail_options = {
      text: '평문 보내기 테스트 444'
    }
    const mail_to = 'weather8128@gmail.com'
    const subject = 'Nodemailer 테스트444'

    return await this.send(mail_to, subject, mail_options)
  }

  sendMailHtml = async (mail_to, subject, html, attachments = null) => {
    const mail_options = {
      html: html
    }

    return await this.send(mail_to, subject, mail_options, attachments)
  }

  sendMailText = async (mail_to, subject, text, attachments = null) => {
    const mail_options = {
      text: text
    }

    return await this.send(mail_to, subject, mail_options, attachments)
  }

  getTransport = () => {
    return nodemailer.createTransport(mail_config.transporter)
  }

  send = async (mail_to, subject, mail_options, attachments = null) => {
    const result = new StdObject()
    const transport = this.getTransport()

    try {
      mail_options.from = mail_config.sender
      if (_.isArray(mail_to)) {
        mail_options.to = _.join(mail_to, ', ')
      } else {
        mail_options.to = mail_to
      }
      mail_options.subject = subject

      if (attachments) {
        mail_options.attachments = attachments
      }
      result.adds(await transport.sendMail(mail_options))
    } catch (error) {
      result.setError(-1)
      result.setHttpStatusCode(500)
      result.setMessage(error.message)
      if (IS_DEV) {
        result.stack = error.stack
      }
      log.error(this.log_prefix, '[send]', error)
    } finally {
      await transport.close()
    }

    return result
  }

  getAttachObject = (file_path, file_name = null, content_type = null) => {
    const attach = { path: file_path }
    if (file_name) {
      attach.filename = file_name
    }
    if (content_type) {
      attach.contentType = content_type
    }
    return attach
  }
}
