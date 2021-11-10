import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";
import CurriculumEducationModel from "../../database/mysql/curriculum/CurriculumEducationModel";
import CurriculumEducationCommentModel from "../../database/mysql/curriculum/CurriculumEducationCommentModel";
import OperationMediaModel from "../../database/mysql/operation/OperationMediaModel";
import OperationModel from "../../database/mysql/operation/OperationModel";
import data from "../../routes/v1/data";
import {request} from "express";
import striptags from "striptags";
import ServiceConfig from "../service-config";

const CurriculumEducationCommentServiceClass = class {
  constructor() {
    this.log_prefix = '[CurriculumEducationCommentServiceClass]'
  }

  getCurriculumEducationCommentModel(database) {
    if (database) {
      return new CurriculumEducationCommentModel(database);
    }
    return new CurriculumEducationCommentModel(DBMySQL);
  }

  getCurriculumEducationComment = async (database, comment_seq) => {
    const edu_comment_model = this.getCurriculumEducationCommentModel(database);
    const comment_info = await edu_comment_model.getCurriculumEducationComment(comment_seq);
    comment_info[0].profile_image_path = ServiceConfig.get('static_storage_prefix') + comment_info[0].profile_image_path
    return comment_info[0];
  }

  getCurriculumEducationCommentList = async (database, education_seq, paging_info, parent_seq = null) => {
    const edu_comment_model = this.getCurriculumEducationCommentModel(database);
    const edu_comment_list = await edu_comment_model.getCurriculumEducationCommentList(education_seq, paging_info, parent_seq);
    for (let cnt = 0; cnt < edu_comment_list.length; cnt++) {
      edu_comment_list[cnt].profile_image_path = ServiceConfig.get('static_storage_prefix') + edu_comment_list[cnt].profile_image_path
    }
    return edu_comment_list;
  }

  createCurriculumEducationComment = async (database, education_seq, member_info, request) => {
    const edu_comment_model = this.getCurriculumEducationCommentModel(database);
    const _member_info = {
      member_seq: member_info.seq,
      user_name: member_info.user_name,
      user_nickname: member_info.user_nickname,
      user_id: member_info.user_id,
      hospname: member_info.hospname,
    };
    const data = {
      curriculum_education_seq: education_seq,
      is_reply: request.is_reply ? 1 : 0,
      writer_info: JSON.stringify(_member_info),
      member_seq: member_info.seq,
      user_name: member_info.user_name,
      user_nickname: member_info.user_nickname,
      comment_html: request.comment_html,
      comment_text: striptags(request.comment_html)
    };
    if (request.is_reply) {
      data.parent_seq = request.parent_seq;
      data.reply_user_info = JSON.stringify(request.reply_user_info);
    }
    const result = await edu_comment_model.createCurriculumEducationComment(data);
    if (request.is_reply) {
      await edu_comment_model.updateCurriculumEducationCommentReplyCount('add', request.parent_seq);
    }
    return result;
  }

  updateCurriculumEducationComment = async (database, comment_seq, request) => {
    const edu_comment_model = this.getCurriculumEducationCommentModel(database);
    return await edu_comment_model.updateCurriculumEducationComment(comment_seq, request);
  }

  getCurriculumEducationCommentTotalCount = async (database, education_seq, comment_seq = null) => {
    const edu_comment_model = this.getCurriculumEducationCommentModel(database);
    return await edu_comment_model.getCurriculumEducationCommentTotalCount(education_seq, comment_seq);
  }
}
const curriculum_education_comment_service = new CurriculumEducationCommentServiceClass()

export default curriculum_education_comment_service
