import MySQLModel from '../../mysql-model'
import striptags from 'striptags'

export default class OperationCommentModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_comment'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationCommentModel]'
    this.list_select_fileds = [
      'operation_comment.seq', 'operation_comment.group_seq', 'operation_comment.member_seq',
      'operation_comment.is_reply', 'operation_comment.writer_info', 'operation_comment.reply_user_info', 'operation_comment.member_seq',
      'operation_comment.user_name', 'operation_comment.user_nickname', 'operation_comment.comment_html',
      'operation_comment.reply_count', 'operation_comment.clip_id', 'operation_comment.clip_info', 'operation_comment.is_clip_deleted',
      'operation_comment.reg_date', 'operation_comment.modify_date',
      'group_info.group_name', 'group_info.profile_image_path as group_profile_image',
      'member.profile_image_path as member_profile_image', 'member.user_name as member_name', 'member.user_name as member_nickname'
    ]
  }

  createComment = async (operation_data_seq, create_params) => {
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

  deleteComment = async (comment_seq) => {
    return await this.delete({ seq: comment_seq })
  }

  changeClipInfo = async (operation_data_seq, clip_id, clip_info) => {
    const update_params = {
      clip_info,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ operation_data_seq, clip_id }, update_params)
  }

  setDeleteClip = async (operation_data_seq, clip_id) => {
    const update_params = {
      is_clip_deleted: 1,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ operation_data_seq, clip_id }, update_params)
  }

  addClipInfo = async (operation_data_seq, comment_seq, clip_id, clip_info) => {
    const update_params = {
      clip_id,
      clip_info,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ seq: comment_seq, operation_data_seq }, update_params)
  }

  removeClipInfo = async (operation_data_seq, comment_seq) => {
    const update_params = {
      clip_id: null,
      clip_info: null,
      modify_date: this.database.raw('NOW()')
    }
    return await this.update({ seq: comment_seq, operation_data_seq }, update_params)
  }

  getCommentList = async (operation_data_seq, parent_seq = null, start = 0, limit = 20, column = 'operation_comment.reg_date', order = 'desc') => {
    const query = this.database.select(this.list_select_fileds)
      .from(this.table_name)
      .leftOuterJoin('group_info', 'group_info.seq', 'operation_comment.group_seq')
      .leftOuterJoin('member', 'member.seq', 'operation_comment.member_seq')
      .where('operation_comment.operation_data_seq', operation_data_seq)
    if (parent_seq) {
      query.andWhere('operation_comment.parent_seq', parent_seq)
      query.andWhere('operation_comment.is_reply', 1)
    } else {
      query.andWhere('operation_comment.is_reply', 0)
    }

    query.orderBy(column, order)
      .limit(limit)
      .offset(start)

    return query
  }

  getComment = async (operation_data_seq, comment_seq) => {
    const query = this.database.select(this.list_select_fileds)
      .from(this.table_name)
      .leftOuterJoin('group_info', 'group_info.seq', 'operation_comment.group_seq')
      .leftOuterJoin('member', 'member.seq', 'operation_comment.member_seq')
      .where('operation_comment.seq', comment_seq)
      .andWhere('operation_comment.operation_data_seq', operation_data_seq)
      .first()
    return query
  }

  getCommentCount = async (operation_data_seq) => {
    const query = this.database.select([this.database.raw('COUNT(*) AS total_count')])
      .from(this.table_name)
      .where('operation_comment.operation_data_seq', operation_data_seq)
      .first()
    return query
  }
}
