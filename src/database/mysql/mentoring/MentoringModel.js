import MySQLModel from "../../mysql-model";
import log from "../../../libs/logger";

export default class MentoringModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'content_counts'
    this.selectable_fields = ['*']
    this.log_prefix = '[MentoringModel]'
    this.field_name_map = {
      video_cnt: true,
      community_cnt: true,
      mentoring_cnt: true
    }
  }

  getOpenMentoCategorys = async () => {
    try {
      const oKnex = this.database.select('content_counts.category_code as code')
        .from('group_info')
        .innerJoin('content_counts', function () {
          this.on('content_counts.group_seq', 'group_info.seq')
        })
        .andWhere('group_info.is_mentoring', 1)
        .distinct()
      return oKnex;
    } catch (e) {
      throw e;
    }
  };

  getBestMentoringLists = async (category_code, group_seq) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'group_info.member_seq', 'group_info.hashtag', 'group_info.profile_image_path'
        , 'member.user_name', 'member.hospname',
        this.database.raw('ifnull(group_counts.community, 0) as community'),
        this.database.raw('ifnull(group_counts.follower, 0) as follower'),
        'group_counts.follower'
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
        this.database.raw('ifnull(group_counts.community, 0) as community'),
        this.database.raw('ifnull(group_counts.follower, 0) as follower'),
        'content_counts.sort_num'
      ]
      const oKnex = this.database.select(display_columns)
        .from('group_info')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .leftOuterJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
        .innerJoin('content_counts', function () {
          this.on('content_counts.group_seq', 'group_info.seq')
            .andOnVal('content_counts.category_code', category_code)
        })
        .where('group_info.is_mentoring', '1')
        .orderBy([{column: 'group_counts.community', order: 'desc'}, {column: 'content_counts.sort_num', order: 'asc'}])
      return oKnex;
    } catch (e) {
      throw e;
    }
  };
  getSearchMentoringLists = async (sSearch) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'group_info.hashtag', 'group_info.profile_image_path',
        'group_info.profile', 'member.hospname',
        this.database.raw('ifnull(group_counts.community, 0) as community'),
        this.database.raw('ifnull(group_counts.follower, 0) as follower')
      ]
      const oKnex = this.database.select(display_columns)
        .from('group_info')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .leftOuterJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
        .leftOuterJoin('content_counts', function () {
          this.onVal('content_counts.category_code', 'all')
            .andOn('content_counts.group_seq', 'group_info.seq')
        })
        .where('group_info.is_mentoring', '1')
        .andWhere(function () {
          this.orWhere('group_info.group_name', 'like', `%${sSearch}%`)
          this.orWhere('member.user_id', 'like', `%${sSearch}%`)
          this.orWhere('member.user_nickname', 'like', `%${sSearch}%`)
          // this.orWhere(this.database.raw(`JSON_EXTRACT('group_info.hashtag', '$[0].tag') = '${sSearch}'`))
        })
        .orderBy([{column: 'group_counts.community', order: 'desc'}])
      return oKnex;
    } catch (e) {
      throw e;
    }
  }
  getOperationMentoReceiveList = async (group_seq) => {
    try {
      const display_columns = [
        'operation_data.seq', 'operation_data.operation_seq', 'operation_data.is_mento_complete',
        'operation_data.title', 'operation_data.group_name',
        'operation_data.reg_date'
      ]
      const oKnex = this.database.select(display_columns)
        .from('operation_data')
        .innerJoin('group_info', 'group_info.seq', 'operation_data.mento_group_seq')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .where(function () {
          this.where('operation_data.type', 'M')
            .andWhere('operation_data.is_complete', '1')
            .andWhere('operation_data.mento_group_seq', group_seq)
            .whereIn('operation_data.is_mento_complete', ['S', 'C'])
        })
        .orderBy([{column: 'operation_data.reg_date', order: 'desc'}])
      return oKnex;
    } catch (e) {
      throw e;
    }
  }
}
