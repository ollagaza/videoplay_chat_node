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
    this.field_name_map = {
      community: true,
      mentoring: true,
      follower: true,
      following: true,
      video_count: true,
      open_count: true,
    }
  }

  getCounts = async group_seq => {
    return this.findOne({ group_seq });
  }

  createCounts = async group_seq => {
    return this.create({ group_seq }, 'seq');
  }

  AddCount = async (seq, update_field) => {
    const params = this.getAddCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }
    return await this.update({ seq }, params)
  }

  MinusCount = async (seq, update_field) => {
    const params = this.getMinusCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }

    return await this.update({ seq }, params)
  }
}
