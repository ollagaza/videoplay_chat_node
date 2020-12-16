import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import SendMail from '../../libs/send-mail'
import SendMailModel from '../../database/mysql/etc/SendMailModel'
import logger from "../../libs/logger";
import ServiceConfig from "../service-config";
import Util from "../../utils/baseutil";

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

  getSendMailList = async (database, group_seq) => {
    const sendmail_model = this.getSendMailModel()
    return await sendmail_model.getSendMailList(group_seq)
  }

  getSendMailOne = async (database, group_seq, mail_seq) => {
    const sendmail_model = this.getSendMailModel(database)
    return await sendmail_model.getSendMailFindOne(group_seq, mail_seq)
  }

  getReservationEmailList = async (database) => {
    const sendmail_model = this.getSendMailModel(database)
    return await sendmail_model.getReservationEmailList()
  }

  createSendMail = async (database, sendmail_data) => {
    const sendmail_model = this.getSendMailModel(database)
    const create_result = await sendmail_model.createSendMail(sendmail_data)

    return create_result
  }

  fileUpdateSendMail = async (database, mail_seq, params) => {
    const sendmail_model = this.getSendMailModel(database)
    return await sendmail_model.fileUpdateSendMail(mail_seq, params)
  }

  sendReservationEmail = async (database) => {

  }

  sendMail = async (database, group_seq, mail_seq) => {
    const mail_info = await this.getSendMailOne(database, group_seq, mail_seq)
    return await new SendMail().sendMailInfo(mail_info);
  }

  uploadFile = async (group_seq, mail_seq, request, response) => {
    logger.debug(this.log_prefix, `{ UPLOAD_ROOT: ${this.UPLOAD_ROOT}, FILE_URL_PREFIX: ${ServiceConfig.get('static_storage_prefix')} }`)
    const mail_info = await this.getSendMailOne(DBMySQL, group_seq, mail_seq)
    const upload_path = `/email/${mail_info.content_id}/`
    const upload_directory = `${ServiceConfig.get('media_root')}/${upload_path}`
    logger.debug(this.log_prefix, '[uploadFile]', `{ mail_seq: ${mail_seq} }`, upload_directory)
    if (!(await Util.fileExists(upload_directory))) {
      await Util.createDirectory(upload_directory)
    }

    const file_field_name = 'sendmail_file'
    await Util.uploadByRequest(request, response, file_field_name, upload_directory)
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }
    const email_file_list = {
      file_path: `${upload_path}`,
      file_original_name: upload_file_info.originalname,
      file_name: request.new_file_name,
      file_size: upload_file_info.size,
      file_type: await Util.getFileType(upload_file_info.path, this.file_name),
      file_url: `${ServiceConfig.get('static_storage_prefix')}${upload_path}/${request.new_file_name}`
    }
    logger.debug(this.log_prefix, '[uploadFile]', `{ mail_seq: ${mail_seq} }`, 'email_file_list', email_file_list)

    let email_file_lists = JSON.parse(mail_info.email_file_list)

    if (!email_file_lists) {
      email_file_lists = []
      email_file_lists.push(email_file_list);
    } else {
      email_file_lists.push(email_file_list);
    }

    const param = {
      email_file_list: JSON.stringify(email_file_lists),
    }

    const result = await this.fileUpdateSendMail(DBMySQL, mail_seq, param)

    return email_file_list
  }
}

const SendMail_Service = new SendMailServiceClass()

export default SendMail_Service
