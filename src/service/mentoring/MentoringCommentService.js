import DBMySQL from '../../database/knex-mysql'
import MentoringCommentModel from '../../database/mysql/mentoring/MentoringCommentModel'
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import ServiceConfig from '../../service/service-config'

const MentoringCommentServiceClass = class {
  constructor () {
    this.log_prefix = '[MentoringCommentServiceClass]'
  }

  getMentoringCommentModel = (database = null) => {
    if (database) {
      return new MentoringCommentModel(database)
    }
    return new MentoringCommentModel(DBMySQL)
  }

  createComment = async (database, operation_data_seq, group_seq, request_body) => {
    if (!request_body || !operation_data_seq || !group_seq || !request_body.comment) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getMentoringCommentModel(database)
    const comment = request_body.comment

    return await comment_model.createComment(operation_data_seq, group_seq, comment)
  }

  changeComment = async (database, operation_data_seq, comment_seq, request_body) => {
    if (!comment_seq || !operation_data_seq || !request_body || !request_body.comment) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment = request_body.comment
    const comment_model = this.getMentoringCommentModel(database)
    return await comment_model.changeComment(operation_data_seq, comment_seq, comment)
  }

  deleteComment = async (database, operation_data_seq, comment_seq) => {
    if (!operation_data_seq || !comment_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getMentoringCommentModel(database)
    return await comment_model.deleteComment(operation_data_seq, comment_seq)
  }

  getCommentList = async (database, operation_data_seq, request_params) => {
    if (!operation_data_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const start = request_params ? Util.parseInt(request_params.start, 0) : 0
    const limit = request_params ? Util.parseInt(request_params.limit, 20) : 20
    const column = request_params ? request_params.column : 'mentoring_comment.reg_date'
    const order = request_params ? request_params.order : 'desc'
    const comment_model = this.getMentoringCommentModel(database)
    const result_list = await comment_model.getCommentList(operation_data_seq, start, limit, column, order)
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
    const comment_model = this.getMentoringCommentModel(database)
    return this.getCommentInfo(await comment_model.getComment(operation_data_seq, comment_seq))
  }

  getCommentInfo = (comment_info) => {
    if (comment_info.profile_image_path) {
      comment_info.profile_image_path = ServiceConfig.get('static_storage_prefix') + comment_info.profile_image_path
    }
    return comment_info
  }

  getCommentCount = async (database, operation_data_seq) => {
    if (!operation_data_seq) {
      throw new StdObject(-1, '잘못된 요청입니다', 400)
    }
    const comment_model = this.getMentoringCommentModel(database)
    const comment_count = await comment_model.getCommentCount(operation_data_seq)
    return comment_count ? Util.parseInt(comment_count.total_count, 0) : 0
  }
}

const mentoring_comment_service = new MentoringCommentServiceClass()
export default mentoring_comment_service
