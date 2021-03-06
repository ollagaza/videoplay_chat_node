import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";

import StdObject from "../../wrapper/std-object";
import ServiceConfig from "../service-config";
import CurriculumModel from "../../database/mysql/curriculum/CurriculumModel";
import CurriculumEducationModel from "../../database/mysql/curriculum/CurriculumEducationModel";
import QuestionService from "./QuestionService";
import CurriculumResultModel from "../../database/mysql/curriculum/CurriculumResultModel";

const CurriculumServiceClass = class {
  constructor() {
    this.log_prefix = '[CurriculumServiceClass]'
  }

  getCurriculumModel(database) {
    if (database) {
      return new CurriculumModel(database);
    }
    return new CurriculumModel(DBMySQL);
  }

  getCurriculumEducationModel(database) {
    if (database) {
      return new CurriculumEducationModel(database);
    }
    return new CurriculumEducationModel(DBMySQL);
  }

  getCurriculumSurveyResultModel(database) {
    if (database) {
      return new CurriculumResultModel(database);
    }
    return new CurriculumResultModel(DBMySQL);
  }

  createCurriculumIntro = async (database, group_auth, request_body) => {
    const curriculum_model = this.getCurriculumModel(database)
    const question_data = request_body.body.params;
    question_data.content_id = Util.getContentId()
    return await curriculum_model.createCurriculum(question_data)
  }

  updateCurriculumIntro = async (database, api_key, request_body) => {
    const curriculum_model = this.getCurriculumModel(database)
    const question_data = request_body.body.params;
    const filter = {
      seq: api_key,
    }
    return await curriculum_model.updateCurriculum(filter, question_data)
  }

  uploadThumbnail = async (curriculum_seq, group_auth, request, response) => {
    const curriculum_model = this.getCurriculumModel()
    const curriculum_info = await curriculum_model.getCurriculum(curriculum_seq)
    if (!curriculum_info || Util.isEmpty(curriculum_info)) {
      return null
    }
    const directory_info = this.getCurriculumDirectoryInfo(group_auth, curriculum_info)
    const media_directory = directory_info.thumbnail_directory
    if (!(await Util.fileExists(media_directory))) {
      await Util.createDirectory(media_directory)
    }
    const thumbnail_file_name = 'thumbnail'
    await Util.uploadByRequest(request, response, 'thumbnail', media_directory, thumbnail_file_name, true)

    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '?????? ???????????? ?????????????????????.', 500)
    }

    const thumbnail_path = directory_info.thumbnail_path + thumbnail_file_name
    const update_result = await curriculum_model.updateCurriculumThumbnail(curriculum_info.seq, thumbnail_path)
    log.debug(this.log_prefix, '[setThumbnailImage]', update_result)
    return directory_info.thumbnail_url_prefix + thumbnail_file_name
  }

  getCurriculumDirectoryInfo(group_auth, curriculum_info) {
    const group_media_path = group_auth.group_member_info.media_path
    const curriculum_media_root = ServiceConfig.getMediaRoot()
    const thumbnail_path = group_media_path + '/curriculum/' + curriculum_info.content_id + '/thumbnail/'
    const thumbnail_directory = curriculum_media_root + thumbnail_path
    const thumbnail_url_prefix = ServiceConfig.get('static_storage_prefix') + thumbnail_path + 'thumbnail'

    return {
      thumbnail_path,
      thumbnail_directory,
      thumbnail_url_prefix,
    }
  }

  getCurriculumList = async (database, group_auth, _group_seq, req, is_open_page = false) => {
    const request_body = req.query ? req.query : {}
    let group_seq = request_body.group_seq ? request_body.group_seq : _group_seq
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    const request_order = request_body.order ? JSON.parse(request_body.order) : null
    const search_keyword = request_body.search_keyword ? request_body.search_keyword : null
    let curriculum_status = group_auth && group_auth.is_group_admin ? 0 : 1
    if (is_open_page) {
      group_seq = null
      curriculum_status = 2
    }

    const curriculum_model = this.getCurriculumModel(database)
    const result = await curriculum_model.getCurriculumList(curriculum_status, group_seq, search_keyword, request_paging, request_order)
    for (let cnt = 0; cnt < result.data.length; cnt++) {
      this.setCurriculumData(result.data[cnt])
    }
    return result
  }
  setCurriculumData(curriculum_info) {
    curriculum_info.thumbnail_url = curriculum_info.thumbnail ? ServiceConfig.get('static_storage_prefix') + curriculum_info.thumbnail : null
    curriculum_info.member_profile_image = ServiceConfig.get('static_storage_prefix') + curriculum_info.member_profile_image
    curriculum_info.group_profile_image = ServiceConfig.get('static_storage_prefix') + curriculum_info.group_profile_image
    curriculum_info.group_top_image = ServiceConfig.get('static_storage_prefix') + curriculum_info.group_top_image
    curriculum_info.group_explain = Util.trim(curriculum_info.group_explain)
    const group_search_keyword = Util.trim(curriculum_info.group_search_keyword)
    curriculum_info.group_search_keyword = group_search_keyword ? JSON.parse(curriculum_info.group_search_keyword) : null
    const hashtag_list = Util.trim(curriculum_info.hashtag_list)
    curriculum_info.hashtag_list = hashtag_list ? JSON.parse(curriculum_info.hashtag_list) : null
  }

  getCurriculum = async (database, curriculum_seq) => {
    const curriculum_model = this.getCurriculumModel(database)
    const result = await curriculum_model.getCurriculum(curriculum_seq)
    this.setCurriculumData(result)
    return result
  }
  getCurriculumEducation = async (database, curriculum_seq) => {
    const curriculum_model = this.getCurriculumEducationModel(database)
    return await curriculum_model.getCurriculumEducationList(curriculum_seq)
  }
  getCurriculumSurvey = async (database, curriculum_seq) => {
    return await QuestionService.getQuestionList(database, curriculum_seq)
  }

  getCurriculumSurveyResult = async (database, curriculum_seq, curriculum_survey) => {
    const result_list = {}
    const curriculum_survey_result_model = this.getCurriculumSurveyResultModel()
    for (let cnt = 0; cnt < curriculum_survey.length; cnt++) {
      const survey_seq = `result_${curriculum_survey[cnt].seq}`
      const result = await curriculum_survey_result_model.getCurriculumResultList(curriculum_survey[cnt].seq)
      result_list[survey_seq] = result
    }
    return result_list
  }

  getRecommendCurriculumList = async (database, curriculum_seq = null) => {
    const curriculum_model = this.getCurriculumModel(database);
    const current_curriculum = await curriculum_model.getCurriculum(curriculum_seq);
    const recommend_curriculum_list = await curriculum_model.getRecommendCurriculumList(curriculum_seq, current_curriculum.group_seq);
    recommend_curriculum_list.forEach(curriculum => {
      this.setCurriculumData(curriculum)
    })
    return recommend_curriculum_list;
  }

  deleteCurriculum = async (database, group_auth, request) => {
    const curriculum_model = this.getCurriculumModel(database);
    const curriculum_seq = request.params.api_key
    return await curriculum_model.deleteCurriculum(curriculum_seq)
  }
}

const curriculum_service_class = new CurriculumServiceClass()

export default curriculum_service_class
