import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'
import logger from "../../../libs/logger";

export default class GroupBoardCommentModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'board_comment'
    this.log_prefix = '[GroupBoardCommentModel]'
    this.selectable_fields = ['*']
  }

  getBoardCommentList = async (board_data_seq, member_seq) => {
    const oKnex = this.database.select([`${this.table_name}.*`,  'mem.profile_image_path as member_profile_image', 'recommend.regist_date as recommend_regist_date'])
      .from(this.table_name)
      .innerJoin('member as mem', { 'mem.seq': 'member_seq' })
      .leftOuterJoin('board_comment_recommend as recommend', (query) => {
        query.on('recommend.board_comment_seq', 'board_comment.seq')
        query.andOnVal('recommend.member_seq', member_seq)
      })
      .where((query) => {
        query.where('board_comment.board_data_seq', board_data_seq)
        query.andWhere('status', 'Y')
      })
      .orderBy([{column: 'origin_seq', order: 'desc'}, { column: 'sort_num', order: 'asc' }])
    return oKnex
  }

  CreateBoardComment = async (comment_data) => {
    return this.create(comment_data, 'seq');
    // const exclusions = Object.keys(comment_data)
    //   .filter(item => item !== 'seq')
    //   .map(item => this.database.raw('?? = ?', [item, comment_data[item]]).toString())
    //   .join(',\n')
    // const insertString = this.database(this.table_name).insert(comment_data).toString()
    // const conflictString = this.database.raw(` ON DUPLICATE KEY UPDATE ${exclusions}, \`modify_date\` = current_timestamp()`).toString()
    // const query = (insertString + conflictString)
    // const result = await this.database
    //   .raw(query)
    //   .on('query', data => log.debug(this.log_prefix, 'CreateUpdateBoardData', data.sql))
    //
    // return result.shift()
  }

  UpdateBoardComment = async (seq, comment_data) => {
    return this.update({ seq }, comment_data);
  }

  updateBoardCommentOriginSeq = async (comment_seq) => {
    return this.update({ seq: comment_seq }, { origin_seq: comment_seq })
  }

  incrementBoardCommentReCommendCnt = async (comment_seq) => {
    return this.increment({ seq: comment_seq }, { recommend_cnt: 1 })
  }
  decrementBoardCommentReCommendCnt = async (comment_seq) => {
    return this.decrement({ seq: comment_seq }, { recommend_cnt: 1 })
  }

  getCommentCount = async (comment_seq) => {
    const result = await this.database.count('* as total_count').from(this.table_name).where('seq', comment_seq).orWhere('origin_seq', comment_seq).first()
    if (!result || !result.total_count) {
      return 0
    } else {
      return result.total_count
    }
  }

  DeleteComment = async (comment_seq) => {
    return this.update({ seq: comment_seq }, { status: 'D' })
  }

  getCommentInfo = async (comment_seq) => {
    const oKnex = this.database.select(['*'])
      .from(this.table_name)
      .where('seq', comment_seq)
      .first()
    return oKnex
  }

  getBoardCommentListByGroupSeqMemberSeq = async (group_seq, member_seq) => {
    if (!group_seq && !member_seq) {
      return null;
    }
    return this.database.select(['*'])
      .from(this.table_name)
      .where({ group_seq: group_seq, member_seq: member_seq })
  }
}