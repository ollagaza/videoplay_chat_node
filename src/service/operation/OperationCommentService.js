import DBMySQL from '../../database/knex-mysql'
import OperationCommentModel from '../../database/mysql/operation/OperationCommentModel'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import ServiceConfig from '../../service/service-config'
import striptags from 'striptags'

const OperationCommentServiceClass = class {
  constructor () {
    this.log_prefix = '[OperationCommentService]'
  }

  getOperationCommentModel = (database = null) => {
    if (database) {
      return new OperationCommentModel(database)
    }
    return new OperationCommentModel(DBMySQL)
  }

  createComment = async (database, member_info, group_member_info, operation_data_seq, request_body) => {
    if (!member_info || !group_member_info || !request_body || !operation_data_seq || !request_body.comment) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(database)

    const writer_info = {
      user_name: member_info.user_name,
      user_nickname: member_info.user_nickname,
      hospname: member_info.hospname,
      group_name: group_member_info.group_name
    }
    const parent_seq = request_body.parent_seq ? request_body.parent_seq : null
    const is_reply = request_body.is_reply === true ? 1 : 0
    const reply_user_info = is_reply ? JSON.stringify(request_body.reply_user_info) : null
    const comment = request_body.comment
    const clip_id = request_body.clip_id ? request_body.clip_id : null
    const clip_info = clip_id ? JSON.stringify(request_body.clip_info) : null

    const create_params = {
      operation_data_seq,
      parent_seq,
      is_reply,
      writer_info: JSON.stringify(writer_info),
      reply_user_info,
      group_seq: group_member_info.group_seq,
      member_seq: member_info.seq,
      user_name: member_info.user_name,
      user_nickname: member_info.user_nickname,
      comment_html: comment,
      comment_text: striptags(comment),
      clip_id,
      clip_info
    }

    return await comment_model.createComment(operation_data_seq, create_params)
  }

  changeComment = async (database, operation_data_seq, comment_seq, request_body) => {
    if (!comment_seq || !operation_data_seq || !request_body || !request_body.comment) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment = request_body.comment

    const comment_model = this.getOperationCommentModel(database)
    return await comment_model.changeComment(operation_data_seq, comment_seq, comment)
  }

  deleteComment = async (database, operation_data_seq, comment_seq) => {
    if (!operation_data_seq || !comment_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(database)
    return await comment_model.deleteComment(operation_data_seq, comment_seq)
  }

  changeClipInfo = async (database, operation_data_seq, request_body) => {
    if (!operation_data_seq || !request_body || !request_body.clip_id) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const clip_id = request_body.clip_id
    const clip_info = JSON.stringify(request_body.clip_info)

    const comment_model = this.getOperationCommentModel(database)
    return await comment_model.changeClipInfo(operation_data_seq, clip_id, clip_info)
  }

  deleteClipInfo = async (database, operation_data_seq, request_body) => {
    if (!operation_data_seq || !request_body || !request_body.clip_id) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const clip_id = request_body.clip_id

    const comment_model = this.getOperationCommentModel(database)
    return await comment_model.setDeleteClip(operation_data_seq, clip_id)
  }

  getCommentList = async (database, operation_data_seq, request_params) => {
    if (!operation_data_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const parent_seq = request_params ? Util.parseInt(request_params.parent_seq, null) : null
    const start = request_params ? Util.parseInt(request_params.start, 0) : 0
    const limit = request_params ? Util.parseInt(request_params.limit, 20) : 20
    const column = request_params ? request_params.column : 'operation_comment.reg_date'
    const order = request_params ? request_params.order : 'desc'
    const comment_model = this.getOperationCommentModel(database)
    const result_list = await comment_model.getCommentList(operation_data_seq, parent_seq, start, limit, column, order)
    const comment_list = []
    if (result_list) {
      for (let i = 0; i < result_list.length; i++) {
        comment_list.push(this.getCommentInfo(result_list[i]))
      }
    }
    return comment_list
  }

  getComment = async (database, operation_data_seq, comment_seq) => {
    if (!operation_data_seq || !comment_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(database)
    return this.getCommentInfo(await comment_model.getComment(operation_data_seq, comment_seq))
  }

  getCommentInfo = (comment_info) => {
    if (comment_info.group_profile_image) {
      comment_info.group_profile_image = ServiceConfig.get('static_storage_prefix') + comment_info.group_profile_image
    }
    if (comment_info.member_profile_image) {
      comment_info.member_profile_image = ServiceConfig.get('static_storage_prefix') + comment_info.member_profile_image
    }
    if (comment_info.writer_info) {
      comment_info.writer_info = JSON.parse(comment_info.writer_info)
    }
    if (comment_info.reply_user_info) {
      comment_info.reply_user_info = JSON.parse(comment_info.reply_user_info)
    }
    if (comment_info.clip_info) {
      comment_info.clip_info = JSON.parse(comment_info.clip_info)
    }
    comment_info.is_clip_deleted = comment_info.is_clip_deleted === 1

    return comment_info
  }

  getCommentCount = async (database, operation_data_seq) => {
    if (!operation_data_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getOperationCommentModel(database)
    const comment_count = await comment_model.getCommentCount(operation_data_seq)
    return comment_count ? Util.parseInt(comment_count.total_count, 0) : 0
  }
}

const operation_comment_service = new OperationCommentServiceClass()
export default operation_comment_service
