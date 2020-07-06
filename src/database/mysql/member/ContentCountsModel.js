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
        .orWhere(function () {
          this.orWhere('group_info.group_name', 'like', `%${sSearch}%`)
          this.orWhere('member.user_id', 'like', `%${sSearch}%`)
          this.orWhere('member.user_nickname', 'like', `%${sSearch}%`)
          // this.orWhere(this.database.raw(`JSON_EXTRACT('group_info.hashtag', '$[0].tag') = '${sSearch}'`))
        })
        .orderBy([{column: 'group_counts.community', order: 'desc'}, {column: 'content_counts.sort_num', order: 'asc'}])
      return oKnex;
    } catch (e) {
      throw e;
    }
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
