import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class GroupCountModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'group_counts'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupCountsModel]'
  }

  getCounts = async group_seq => {
    return this.findOne({ group_seq });
  }

  createCounts = async group_seq => {
    return this.create({ group_seq }, 'seq');
  }

  AddCount = async (group_seq, update_field) => {
    const params = {};
    params[update_field] = this.database.raw(`${update_field} + 1`)
    return await this.update({ group_seq: group_seq }, params)
  }

  MinusCount = async (group_seq, update_field) => {
    const params = {};
    params[update_field] = this.database.raw(`case when ${update_field} != 0 then ${update_field} - 1 else 0 end`)
    return await this.update({ group_seq: group_seq }, params)
  }
}
