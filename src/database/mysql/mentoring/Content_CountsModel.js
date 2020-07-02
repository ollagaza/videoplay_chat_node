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

  getBestMentoringLists = async (category_code) => {
    const display_columns = [
      'group_info.seq as group_seq', 'group_info.member_seq', 'group_info.hashtag', 'group_info.profile_image_path'
      , 'member.user_name', 'member.hospname'
      , 'group_counts.community', 'group_counts.mentoring', 'group_counts.follower'
      , this.database.raw('case when count(following.seq) > 0 then 1 else 0 end following_chk')
    ]
    const groupby_columns = [
      'group_info.seq', 'group_info.member_seq', 'group_info.hashtag', 'group_info.profile_image_path'
      , 'member.user_name', 'member.hospname'
      , 'group_counts.community', 'group_counts.mentoring', 'group_counts.follower'
    ]
    const oKnex = this.database.select(display_columns)
      .from('member')
      .innerJoin('group_info', function() {
        this.on('group_info.member_seq', 'member.seq')
          .andOn('group_info.is_mentoring', 1)
      })
      .innerJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
      .leftOuterJoin('following', 'following.following_seq', 'group_info.seq')
      .leftOuterJoin('content_counts', function() {
        if (category_code !== 'all') {
          this.on('content_counts.group_seq', 'group_info.seq')
            .andOn('content_counts.category_code', category_code)
        } else {
          this.on('content_counts.group_seq', 'group_info.seq')
        }
      })
      .groupBy(groupby_columns);
    return oKnex;
  };
}
