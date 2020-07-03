import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class ContentCountsModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'content_counts'
    this.selectable_fields = ['*']
    this.log_prefix = '[ContentCountsModel]'
    this.field_name_map = {
      video_cnt: true,
      community_cnt: true,
      mentoring_cnt: true
    }
  }

  getMentoringLists = async (category_code, group_seq) => {
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
      .innerJoin('group_info', function() {
        this.on('group_info.member_seq', 'member.seq')
          .andOn('group_info.is_mentoring', 1)
      })
      .innerJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
      .leftOuterJoin('following',
        function() {
          this.on('following.group_seq', '=', group_seq).andOn('following.following_seq', '=', 'group_info.seq')
        }
      )
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
  }

  createContentCount = async (category_code, group_seq) => {
    const sql = 'INSERT IGNORE INTO content_counts(`category_code`, `group_seq`) VALUES (?, ?)'
    try {
      await this.database.raw(sql, [category_code, group_seq])
      return true
    } catch (e) {
      log.error(this.log_prefix, '[createContentCount]', e)
      return false
    }
  }

  addContentCount = async (category_code, group_seq, update_field) => {
    const params = this.getAddCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }
    const filters = { category_code, group_seq }
    return await this.update(filters, params)
  }

  minusContentCount = async (category_code, group_seq, update_field) => {
    const params = this.getMinusCountQueryParams(update_field, this.field_name_map)
    if (!params) {
      return false
    }
    const filters = { category_code, group_seq }
    return await this.update(filters, params)
  }

  getGroupTotalCount = async (group_seq) => {
    const query = this.database.select([
      this.database.raw('sum(video_cnt) as total_video_count'),
      this.database.raw('sum(community_cnt) as total_community_count'),
      this.database.raw('sum(mentoring_cnt) as total_mentoring_count')
    ])
      .from(this.table_name)
      .where({ group_seq })
      .first()
    const query_result = await query
    const result = {
      video_cnt: 0,
      community_cnt: 0,
      mentoring_cnt: 0,
    }
    if (query_result) {
      result.video_cnt = Util.parseInt(query_result.total_video_count, 0)
      result.community_cnt = Util.parseInt(query_result.total_community_count, 0)
      result.mentoring_cnt = Util.parseInt(query_result.total_mentoring_count, 0)
    }
    return result
  }

  setContentCount = async (category_code, group_seq, update_field) => {
    const filters = { category_code, group_seq }
    return await this.update(filters, update_field)
  }
}
