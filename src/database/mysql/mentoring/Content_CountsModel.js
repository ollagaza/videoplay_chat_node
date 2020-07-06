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

  getBestMentoringLists = async (category_code, group_seq) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'group_info.member_seq', 'group_info.hashtag', 'group_info.profile_image_path'
        , 'member.user_name', 'member.hospname'
        , 'group_counts.community', 'group_counts.mentoring', 'group_counts.follower'
        , this.database.raw('case when count(following.seq) > 0 then 1 else 0 end following_chk')
      ]
      const groupby_columns = [
        'group_info.seq'
      ]
      const oKnex = this.database.select(display_columns)
        .from('member')
        .innerJoin('group_info', function () {
          this.on('group_info.member_seq', 'member.seq')
            .andOn('group_info.is_mentoring', 1)
        })
        .innerJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
        .innerJoin('content_counts', function () {
          this.on('content_counts.group_seq', 'group_info.seq')
            .andOnVal('content_counts.category_code', category_code)
            .andOnVal('content_counts.is_best', '1');
        })
        .leftOuterJoin('following',
          function () {
            this.on('following.group_seq', '=', group_seq).andOn('following.following_seq', '=', 'group_info.seq')
          }
        )
        .groupBy(groupby_columns);
      return oKnex;
    } catch (e) {
      throw e;
    }
  };
  getRecommendMentoringLists = async (category_code) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'member.hospname', 'group_info.hashtag', 'group_info.profile_image_path',
        'group_counts.community', 'group_counts.follower', 'content_counts.sort_num'
      ]
      const oKnex = this.database.select(display_columns)
        .from('group_info')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .leftOuterJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
        .leftOuterJoin('content_counts', function () {
          this.on('content_counts.group_seq', 'group_info.seq')
            .andOnVal('content_counts.category_code', category_code)
        })
        .where('group_info.is_mentoring', '1')
        .orderBy([{ column: 'group_counts.community', order: 'desc' }, { column: 'content_counts.sort_num', order: 'asc' }])
      return oKnex;
    } catch (e) {
      throw e;
    }
  };
  getSearchMentoringLists = async (sSearch) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'member.hospname', 'group_info.hashtag', 'group_info.profile_image_path',
        'group_counts.community', 'group_counts.follower', 'content_counts.sort_num'
      ]
      const oKnex = this.database.select(display_columns)
        .from('group_info')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .leftOuterJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
        .leftOuterJoin('content_counts', 'content_counts.group_seq', 'group_info.seq')
        .where('group_info.is_mentoring', '1')
        .orWhere(function() {
          this.orWhere('group_info.group_name', 'like', `%${sSearch}%`)
          this.orWhere('member.user_id', 'like', `%${sSearch}%`)
          this.orWhere('member.user_nickname', 'like', `%${sSearch}%`)
          // this.orWhere(this.database.raw(`JSON_EXTRACT('group_info.hashtag', '$[0].tag') = '${sSearch}'`))
        })
        .orderBy([{ column: 'group_counts.community', order: 'desc' }, { column: 'content_counts.sort_num', order: 'asc' }])
      return oKnex;
    } catch (e) {
      throw e;
    }
  };
}
