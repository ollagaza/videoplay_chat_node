import MySQLModel from '../../mysql-model'

export default class MentoringModel extends MySQLModel {
  constructor (database) {
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
        .andWhere('group_info.is_channel', 1)
        .distinct()
      return oKnex
    } catch (e) {
      throw e
    }
  }

  getBestMentoringLists = async (category_code, group_seq) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'group_info.member_seq', 'group_info.hashtag', 'group_info.profile_image_path'
        , 'member.user_name', 'member.hospname', 'group_info.is_mentoring',
        this.database.raw('ifnull(group_counts.community, 0) as community'),
        this.database.raw('ifnull(group_counts.mentoring, 0) as mentoring'),
        this.database.raw('ifnull(group_counts.follower, 0) as follower'),
        this.database.raw('ifnull(group_counts.following, 0) as following'),
        this.database.raw('ifnull(group_counts.video_count, 0) as video_count'),
        this.database.raw('ifnull(group_counts.open_count, 0) as open_count'),
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
          this.andOnVal('content_counts.category_code', category_code)
        })
        .leftOuterJoin('following',
          function () {
            this.on('following.group_seq', '=', group_seq).andOn('following.following_seq', '=', 'group_info.seq')
          }
        )
        .groupBy(groupby_columns)
        .orderBy([{ column: 'content_counts.is_best', order: 'desc' }, {
          column: 'content_counts.mentoring_cnt',
          order: 'desc'
        }])
        .limit(2)
      return oKnex
    } catch (e) {
      throw e
    }
  }

  getRecommendMentoringLists = async (category_code) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'member.hospname', 'group_info.hashtag', 'group_info.profile_image_path', 'group_info.is_mentoring',
        this.database.raw('ifnull(group_counts.community, 0) as community'),
        this.database.raw('ifnull(group_counts.mentoring, 0) as mentoring'),
        this.database.raw('ifnull(group_counts.follower, 0) as follower'),
        this.database.raw('ifnull(group_counts.following, 0) as following'),
        this.database.raw('ifnull(group_counts.video_count, 0) as video_count'),
        this.database.raw('ifnull(group_counts.open_count, 0) as open_count'),
        'content_counts.sort_num'
      ]
      const oKnex = this.database.select(display_columns)
        .from('group_info')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .innerJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
        .innerJoin('content_counts', function () {
          this.on('content_counts.group_seq', 'group_info.seq')
            .andOnVal('content_counts.category_code', category_code)
        })
        .where('group_info.is_channel', '1')
        .orderBy([{ column: 'group_counts.community', order: 'desc' }, {
          column: 'content_counts.sort_num',
          order: 'asc'
        }])
      return oKnex
    } catch (e) {
      throw e
    }
  }
  getSearchMentoringLists = async (sSearch) => {
    try {
      const display_columns = [
        'group_info.seq as group_seq', 'group_info.group_name', 'group_info.hashtag', 'group_info.profile_image_path',
        'group_info.profile', 'member.hospname', 'group_info.is_mentoring',
        this.database.raw('ifnull(group_counts.community, 0) as community'),
        this.database.raw('ifnull(group_counts.follower, 0) as follower'),
        this.database.raw('ifnull(group_counts.mentoring, 0) as mentoring'),
      ]
      const oKnex = this.database.select(display_columns)
        .from('group_info')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .leftOuterJoin('group_counts', 'group_counts.group_seq', 'group_info.seq')
        .leftOuterJoin('content_counts', function () {
          this.onVal('content_counts.category_code', 'all')
            .andOn('content_counts.group_seq', 'group_info.seq')
        })
        .where('group_info.is_channel', '1')
        .andWhere(function () {
          this.orWhere('group_info.group_name', 'like', `%${sSearch}%`)
          this.orWhere('member.user_id', 'like', `%${sSearch}%`)
          this.orWhere('member.user_nickname', 'like', `%${sSearch}%`)
          // this.orWhere(this.database.raw(`JSON_EXTRACT('group_info.hashtag', '$[0].tag') = '${sSearch}'`))
        })
        .orderBy([{ column: 'group_counts.community', order: 'desc' }])
      return oKnex
    } catch (e) {
      throw e
    }
  }
  getOperationMentoReceiveList = async (group_seq) => {
    try {
      const display_columns = [
        'operation_data.seq', 'operation_data.operation_seq', 'operation_data.is_mento_complete',
        'operation_data.title', 'operation_data.group_name',
        'operation_data.reg_date', 'operation_data.group_seq', 'operation_data.mento_group_seq',
        'operation_data.thumbnail',
        'operation.analysis_status', 'operation.is_analysis_complete', 'operation.progress'
      ]
      const oKnex = this.database.select(display_columns)
        .from('operation')
        .innerJoin('operation_data', 'operation_data.operation_seq', 'operation.seq')
        .where(function () {
          this.where('operation_data.type', 'M')
            .andWhere('operation_data.is_complete', '1')
            .andWhere('operation_data.mento_group_seq', group_seq)
            .whereIn('operation_data.is_mento_complete', ['S', 'C'])
        })
        .orderBy([{ column: 'operation_data.reg_date', order: 'desc' }])
      return oKnex
    } catch (e) {
      throw e
    }
  }

  getCategoryForBestMentos_withAdmin = async (category_code) => {
    try {
      const print_column = [
        'group_info.seq', 'group_info.group_name', 'member.user_id',
        this.database.raw('case when group_info.group_type = \'P\' then \'개인\' else \'팀\' end group_type'),
        'member.treatcode', 'member.hospname',
        this.database.raw('case when content_counts.is_best = 1 then \'우측\' else \'좌측\' end best_position')
      ]
      const oKnex = this.database.select(print_column)
        .from('content_counts')
        .innerJoin('group_info', 'group_info.seq', 'content_counts.group_seq')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .where(function () {
          this.whereIn('content_counts.is_best', ['1', '2'])
            .andWhere('content_counts.category_code', category_code)
        })
        .orderBy([{ column: 'content_counts.is_best', order: 'asc' }])
      return oKnex
    } catch (e) {
      throw e
    }
  }

  getAllMentoList_withAdmin = async (search_keyword, page_navigation, category_code) => {
    try {
      const print_column = [
        'group_info.seq', 'group_info.group_name', 'member.user_id',
        this.database.raw('case when group_info.group_type = \'P\' then \'개인\' else \'팀\' end group_type'),
        'member.treatcode', 'member.hospname'
      ]
      const subQuery = this.database.select('content_counts.group_seq')
        .from('content_counts')
        .where('content_counts.category_code', category_code)
        .whereNotIn('content_counts.is_best', [1, 2])

      const oKnex = this.database.select(print_column)
        .from('group_info')
        .leftOuterJoin('member', 'member.seq', 'group_info.member_seq')
        .where('group_info.is_mentoring', 1)
        .whereNotIn('group_info.seq',
          this.database.raw(`select content_counts.group_seq from content_counts where content_counts.category_code = '${category_code}' and content_counts.is_best in (1, 2)`)
        )
        .orderBy([{ column: 'group_info.reg_date', order: 'desc' }])
      if (search_keyword) {
        oKnex.andWhere(function () {
          this.where('group_info.group_name', 'like', `%${search_keyword}%`)
            .orWhere('member.user_id', 'like', `%${search_keyword}%`)
        })
      }
      return this.queryPaginated(oKnex, page_navigation.list_count, page_navigation.cur_page, page_navigation.page_count, page_navigation.no_paging)
    } catch (e) {
      throw e
    }
  }

  rtnBestMento = async (category_code, best_num) => {
    try {
      const print_column = [
        'group_info.seq', 'group_info.group_name', 'member.user_id',
        this.database.raw('case when group_info.group_type = \'P\' then \'개인\' else \'팀\' end group_type'),
        'member.treatcode', 'member.hospname',
        this.database.raw('case when content_counts.is_best = 1 then \'우측\' else \'좌측\' end best_position')
      ]
      const oKnex = this.database.select(print_column)
        .from('content_counts')
        .innerJoin('group_info', 'group_info.seq', 'content_counts.group_seq')
        .innerJoin('member', 'member.seq', 'group_info.member_seq')
        .where(function () {
          this.andWhere('content_counts.is_best', best_num)
            .andWhere('content_counts.category_code', category_code)
        })
        .orderBy([{ column: 'content_counts.is_best', order: 'asc' }])
      return oKnex
    } catch (e) {
      throw e
    }
  }

  updateBestMento = async (category_code, group_seq, best_num) => {
    const oKnex = this.database

    return await oKnex.raw(`insert into ${this.table_name} (category_code, group_seq, is_best) values('${category_code}', ${group_seq}, ${best_num}) on duplicate key update is_best = ${best_num}`)
  }
}
