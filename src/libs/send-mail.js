import _ from 'lodash'
import fs from 'fs'
import FormData from 'form-data'
import Util from '../utils/Util'
import ServiceConfig from '../service/service-config'
import StdObject from '../wrapper/std-object'

export default class SendMail {
  constructor () {
    this.log_prefix = '[SendMail]'
  }

  sendMailHtml = async (mail_to_list, title, body, sender_name = null, sender_email = null, attach_file = null) => {
    return await this.send(mail_to_list, title, body, sender_name, sender_email, attach_file)
  }

  sendMailText = async (mail_to_list, title, body, sender_name = null, sender_email = null, attach_file = null) => {
    return await this.send(mail_to_list, title, body, sender_name, sender_email, attach_file)
  }

  sendMailInfo = async (mail_info) => {
    const receive_email_address = JSON.parse(mail_info.receive_email_address)
    const email_file_list = JSON.parse(mail_info.email_file_list)
    return await this.send(receive_email_address, mail_info.email_title, mail_info.email_desc, mail_info.send_email_name, mail_info.send_email_address, email_file_list)
  }

  uploadCloudfile = async (attach_file) => {
    const file_list = typeof attach_file === 'string' ? JSON.parse(attach_file) : attach_file
    const tempRequestIds = []

    const upload_form_data = new FormData();

    for (let cnt = 0; cnt < Object.keys(file_list).length; cnt++) {
      const full_path = `${ServiceConfig.get('media_root')}${file_list[cnt].file_path}${file_list[cnt].file_name}`
      const file = await fs.createReadStream(full_path)
      upload_form_data.append('fileList', file);
    }
    const upload_file = await this.sendFile(upload_form_data)

    for (let file_cnt = 0; file_cnt < upload_file.files.length; file_cnt++) {
      tempRequestIds.push(upload_file.files[file_cnt].fileId);
    }

    return tempRequestIds
  }

  sendFile = async (form) => {
    const space = ' '  // 공백
    const new_line = '\n'  // 줄바꿈
    const method = 'POST'  // HTTP 메서드
    const url = '/api/v1/files'  // 도메인을 제외한 "/" 아래 전체 url (쿼리스트링 포함)
    const timestamp = `${Util.getCurrentTimestamp(true)}`  // 현재 타임스탬프 (epoch, millisecond)
    const access_key = `${ServiceConfig.get('naver_access_key')}`  // access key id (from portal or Sub Account)
    const secret_key = `${ServiceConfig.get('naver_secret_key')}`  // secret key (from portal or Sub Account)

    const signature_message = `${method}${space}${url}${new_line}${timestamp}${new_line}${access_key}`
    let signature = null
    let send_email_result = null

    try {
      signature = Util.hmac(secret_key, signature_message)
      const request_options = {
        method: 'POST',
        hostname: 'mail.apigw.ntruss.com',
        port: 443,
        path: url,
        headers: form.getHeaders()
      }

      request_options.headers['x-ncp-apigw-timestamp'] = timestamp
      request_options.headers['x-ncp-iam-access-key'] = access_key
      request_options.headers['x-ncp-apigw-signature-v2'] = signature

      let request_result = await Util.httpRequestFormData(request_options, form, true)
      request_result = JSON.parse(request_result)

      send_email_result = new StdObject()
      if (!request_result.tempRequestId) {
        send_email_result.error = -1
        send_email_result.message = '첨부파일 업로드 실패'
        send_email_result.add('request_result', request_result)
        send_email_result.add('mail_info', form)
        throw send_email_result
      }

      return request_result;
    } catch (error) {
      throw error
    }
  }

  sendMail = async (mail_info) => {
    // 참조: https://apidocs.ncloud.com/ko/ai-application-service/cloud_outbound_mailer/createmailrequest/
    const space = ' '  // 공백
    const new_line = '\n'  // 줄바꿈
    const method = 'POST'  // HTTP 메서드
    const url = '/api/v1/mails'  // 도메인을 제외한 "/" 아래 전체 url (쿼리스트링 포함)
    const timestamp = `${Util.getCurrentTimestamp(true)}`  // 현재 타임스탬프 (epoch, millisecond)
    const access_key = `${ServiceConfig.get('naver_access_key')}`  // access key id (from portal or Sub Account)
    const secret_key = `${ServiceConfig.get('naver_secret_key')}`  // secret key (from portal or Sub Account)

    const signature_message = `${method}${space}${url}${new_line}${timestamp}${new_line}${access_key}`
    let signature = null
    let send_email_result = null

    try {
      signature = Util.hmac(secret_key, signature_message)
      const request_options = {
        method: 'POST',
        hostname: 'mail.apigw.ntruss.com',
        port: 443,
        path: url,
        headers: {
          'Content-Type': 'application/json',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': access_key,
          'x-ncp-apigw-signature-v2': signature
        }
      }

      let request_result = await Util.httpRequest(request_options, mail_info, true)
      request_result = JSON.parse(request_result)

      send_email_result = new StdObject()
      if (!request_result.requestId) {
        send_email_result.error = -1
        send_email_result.message = '이메일 발송 실패'
        send_email_result.add('request_result', request_result)
        send_email_result.add('mail_info', mail_info)
        throw send_email_result
      }
    } catch (error) {
      throw error
    }

    return send_email_result;
  }

  send = async (mail_to_list, title, body, sender_name = null, sender_email = null, attach_file = null) => {
    const recipients = this.getRecipients(mail_to_list)
    if (recipients.length <= 0) {
      throw new StdObject(-1, '수신자 목록이 없습니다.')
    }
    let send_email_result = null;
    try {
      const mail_info = {
        'senderAddress': sender_email ? sender_email : 'no_reply@surgstory.com',
        'senderName': 'SurgStory',
        'title': title,
        'body': body,
        'recipients': _.reject(recipients, { address: sender_email })
      }
      if (sender_name) {
        mail_info.senderName = sender_name
      }
      if (attach_file) {
        const attach_file_list = await this.uploadCloudfile(attach_file)
        mail_info['attachFileIds'] = attach_file_list
      }
      send_email_result = await this.sendMail(JSON.stringify(mail_info))
    } catch (error) {
      throw error
    }

    return send_email_result
  }

  parseMailAddress = (email_address) => {
    if (!email_address) {
      return null
    }
    const regexp = /^(.+) <(.+)>$/
    email_address = _.trim(email_address)
    if (!email_address) {
      return null
    }

    const result = {
      name: null,
      address: null
    }
    if (regexp.test(email_address)) {
      const match = email_address.match(regexp)
      result.name = match[1]
      result.address = match[2]
    } else {
      result.address = email_address
    }

    return result
  }

  getRecipients = (mail_to_list) => {
    const recipients = []
    if (typeof mail_to_list === 'string') {
      const recipient = {
        'address': mail_to_list,
        'type': 'R'
      }
      recipients.push(recipient)
    } else {
      for (let i = 0; i < mail_to_list.length; i++) {
        const email_info = this.parseMailAddress(mail_to_list[i])
        if (email_info && email_info.address) {
          const recipient = {
            'address': email_info.address,
            'type': 'R'
          }
          if (email_info.name) {
            recipient.name = email_info.name
          }
          recipients.push(recipient)
        }
      }
    }
    return recipients
  }
}
