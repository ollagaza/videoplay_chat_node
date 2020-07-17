import MySQLModel from "../../mysql-model";
import log from "../../../libs/logger";
import striptags from 'striptags'

export default class MentoringCommentModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'mentoring_comment'
    this.selectable_fields = ['*']
    this.log_prefix = '[MentoringCommentModel]'
    this.list_select_fileds = [
      'mentoring_comment.seq', 'mentoring_comment.group_seq', 'mentoring_comment.comment_html', 'mentoring_comment.reg_date', 'mentoring_comment.modify_date',
      'group_info.group_name', 'group_info.profile_image_path'
    ]
  }

  createComment = async (operation_data_seq, group_seq, comment) => {
    const create_params = {
      operation_data_seq,
      group_seq,
      comment_html: comment,
      comment_text: striptags(comment)
    }
    return await this.create(create_params, 'seq')
  }

  changeComment = async (operation_data_seq, comment_seq, comment) => {
    const update_params = {
      comment_html: comment,
      comment_text: striptags(comment),
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ seq: comment_seq, operation_data_seq }, update_params)
  }

  deleteComment = async (operation_data_seq, comment_seq) => {
    return await this.delete({ seq: comment_seq, operation_data_seq })
  }

  getCommentList = async (operation_data_seq, start = 0, limit = 20, column = 'mentoring_comment.reg_date', order = 'desc') => {
    const query = this.database.select(this.list_select_fileds)
      .from(this.table_name)
      .innerJoin('group_info', 'group_info.seq', 'mentoring_comment.group_seq')
      .where('mentoring_comment.operation_data_seq', operation_data_seq)
      .orderBy(column, order)
      .limit(limit)
      .offset(start)
    return query
  }

  getComment = async (operation_data_seq, comment_seq) => {
    const query = this.database.select(this.list_select_fileds)
      .from(this.table_name)
      .innerJoin('group_info', 'group_info.seq', 'mentoring_comment.group_seq')
      .where('mentoring_comment.seq', comment_seq)
      .andWhere('mentoring_comment.operation_data_seq', operation_data_seq)
      .first()
    return query
  }

  getCommentCount = async (operation_data_seq) => {
    const query = this.database.select([this.database.raw('COUNT(*) AS total_count')])
      .from(this.table_name)
      .innerJoin('group_info', 'group_info.seq', 'mentoring_comment.group_seq')
      .where('mentoring_comment.operation_data_seq', operation_data_seq)
      .first()
    return query
  }
}
