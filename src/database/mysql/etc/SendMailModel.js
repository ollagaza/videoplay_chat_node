import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class SendMailModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'sendmail'
    this.selectable_fields = ['*']
    this.log_prefix = '[SendMailModel]'
  }

  createSendMail = async (sendmail_data) => {
    return await this.create(sendmail_data, 'seq');
  }
}
