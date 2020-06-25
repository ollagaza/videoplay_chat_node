import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class Content_CountsModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'content_counts'
    this.selectable_fields = ['*']
    this.log_prefix = '[Content_CountsModel]'
  }

  getMentoringLists = async (category_code) => {
    const oKnex = this.database.select(this.selectable_fields)
      .from('member')
      .innerJoin('group_info', function() {
        this.on('group_info.member_seq', 'member.seq')
          .andOn('group_info.is_mentoring', 1)
      })
      .leftOuterJoin('content_counts', function() {
        if (category_code !== 'all') {
          this.on('content_counts.group_seq', 'group_info.seq')
            .andOn('content_counts.category_code', category_code)
        } else {
          this.on('content_counts.group_seq', 'group_info.seq')
        }
      })
    return await oKnex;
  };
}
