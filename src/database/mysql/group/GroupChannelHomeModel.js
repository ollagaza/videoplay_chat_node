import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import GroupInfo from '../../../wrapper/member/GroupInfo'
import log from '../../../libs/logger'

export default class GroupChannelHomeModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'group_recommend_list'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupChannelHomeModel]'
  }

  getGroupOwnerTreatLists = async () => {
    const oQuery = this.database.select('member.treatcode')
      .from('group_info')
      .innerJoin('member', 'member.seq', 'group_info.member_seq')
      .where('group_info.group_type', 'G')

    return oQuery
  }

  getMyGroupNewNews = async (arr_group_seq) => {
    const oQuery = this.database.select(['group_info.*', 'op_data.title', this.database.raw('\'operation\' as gubun'), 'op_data.group_name as name', 'op_data.reg_date as regist_date'])
      .from('group_info')
      .innerJoin('operation_data as op_data', 'op_data.group_seq', 'group_info.seq')
      .where('group_info.group_type', 'G')
      .andWhere('group_info.seq', arr_group_seq)
      .andWhere('op_data.reg_date', '>=', this.database.raw('date_sub(now(), interval 7 day)'))
      .unionAll([
        this.database.select(['group_info.*', 'board.subject as title', this.database.raw('\'board\' as gubun'), 'board.write_name as name', 'board.regist_date as regist_date'])
          .from('group_info')
          .innerJoin('board_data as board', 'board.group_seq', 'group_info.seq')
          .where('group_info.group_type', 'G')
          .andWhere('group_info.seq', arr_group_seq)
          .andWhere('board.regist_date', '>=', this.database.raw('date_sub(now(), interval 7 day)'))
      ])
      .orderBy([{column: 'regist_date', order: 'desc'}])
      .limit(3)

    return oQuery
  }

  getOpenOperationTop5 = async () => {
    const oQuery = this.database.select(['op_data.*', 'group_info.profile_image_path', 'group_info.group_name'])
      .from('operation_data as op_data')
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', 'op_data.group_seq')
        query.andOnVal('group_info.group_type', 'G')
      })
      .where('op_data.is_open_video', 1)
      .andWhere('op_data.status', 'Y')
      .orderBy('op_data.view_count', 'desc')
      .limit(5)

    return oQuery
  }

  getOpenBoardTop5 = async () => {
    const oQuery = this.database.select(['board.*', 'group_info.profile_image_path', 'group_info.group_name'])
      .from('board_data as board')
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', 'board.group_seq')
        query.andOnVal('group_info.group_type', 'G')
      })
      .where('board.is_open', 1)
      .andWhere('board.status', 'Y')
      .andWhere('board.depth', 0)
      .orderBy('board.view_cnt', 'desc')
      .limit(5)

    return oQuery
  }

  getRecommendGroupList = async (order, limit) => {
    const oQuery = this.database.select(`${this.table_name}.*`)
      .from(this.table_name)
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', `${this.table_name}.group_seq`)
        query.andOnVal('group_info.group_open', 1)
      })
      .where(this.database.raw('date_format(regist_date, \'%y%m%d\') = date_format(now(), \'%y%m%d\')'))
      .orderBy(order)

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getRecommendGroupListOtherDay = async (order, limit) => {
    const oQuery = this.database.select(`${this.table_name}.*`)
      .from(this.table_name)
      .innerJoin('group_info', (query) => {
        query.on('group_info.seq', `${this.table_name}.group_seq`)
        query.andOnVal('group_info.group_open', 1)
      })
      .where(this.database.raw('date_format(regist_date, \'%y%m%d\') = date_format(date_sub(now(), interval 1 day), \'%y%m%d\')'))
      .orderBy(order)

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getRecommendGroupInfo = async (group_seq) => {
    const oQuery = this.database.select('*')
      .from('group_info')
      .where('seq', group_seq)

    return oQuery.first()
  }

  getRecommendOperationList = async (group_seq, limit) => {
    const oQuery = this.database.select('*')
      .from('operation_data')
      .where('group_seq', group_seq)
      .andWhere('is_open_video', 1)
      .andWhere(this.database.raw('date_format(reg_date, \'%y%m%d\') >= date_format(date_sub(now(), interval 7 day), \'%y%m%d\')'))

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getRecommendBoardList = async (group_seq, limit) => {
    const oQuery = this.database.select('*')
      .from('board_data')
      .where('group_seq', group_seq)
      .andWhere(this.database.raw('date_format(regist_date, \'%y%m%d\') >= date_format(date_sub(now(), interval 7 day), \'%y%m%d\')'))

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  getCategoryGroupInfo = async (menu_id, limit) => {
    const oQuery = this.database.select('*')
      .from('group_info')
      .innerJoin('member', (query) => {
        query.on('member.seq', 'group_info.member_seq')
        query.andOn(this.database.raw(`JSON_SEARCH(JSON_EXTRACT(member.treatcode, '$[*].code'), 'all', '${menu_id}') IS NOT NULL`))
      })
      .where('group_info.group_type', 'G')
      .orderBy('group_info.member_count', 'desc')

    if (limit) {
      oQuery.limit(limit)
    }
    return oQuery
  }

  CreateGroupRecommendListCount = async (group_counting) => {
    await this.create(group_counting)
  }

  checkGroupRecommendCount = async () => {
    return this.findOne(this.database.raw('date_format(regist_date, \'%y%m%d\') = date_format(now(), \'%y%m%d\')'))
  }

  getOperationCount = async () => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(op_data.seq) as count')])
      .from('group_info')
      .innerJoin('operation_data as op_data', 'op_data.group_seq', 'group_info.seq')
      .where('group_info.group_type', 'G')
      .andWhere(this.database.raw('date_format(date_sub(op_data.reg_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
      .groupBy('group_info.seq')
    return oQuery
  }
  getOperationCommentCount = async () => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(op_comment.seq) as count')])
      .from('group_info')
      .innerJoin('operation_comment as op_comment', 'op_comment.group_seq', 'group_info.seq')
      .where('group_info.group_type', 'G')
      .andWhere(this.database.raw('date_format(date_sub(op_comment.reg_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
      .groupBy('group_info.seq')
    return oQuery
  }
  getBoardCount = async () => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(board.seq) as count')])
      .from('group_info')
      .innerJoin('board_data as board', 'board.group_seq', 'group_info.seq')
      .where('group_info.group_type', 'G')
      .andWhere(this.database.raw('date_format(date_sub(board.regist_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
      .groupBy('group_info.seq')
    return oQuery
  }
  getBoardCommentCount = async () => {
    const oQuery = this.database.select(['group_info.seq as group_seq', this.database.raw('count(b_comment.seq) as count')])
      .from('group_info')
      .innerJoin('board_comment as b_comment', 'b_comment.group_seq', 'group_info.seq')
      .where('group_info.group_type', 'G')
      .andWhere(this.database.raw('date_format(date_sub(b_comment.regist_date, interval 7 day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'))
      .groupBy('group_info.seq')
    return oQuery
  }
}
