import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class ContactUsModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'contact_us'
    this.selectable_fields = ['*']
    this.log_prefix = '[ContactUsModel]'
  }

  createContactUs = async (contact_us_info) => {
    return await this.create(contact_us_info, 'seq');
  }
}
