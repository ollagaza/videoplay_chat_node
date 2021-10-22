import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";
import CurriculumModel from "../../database/mysql/curriculum/CurriculumModel";
import CurriculumQuestionModel from "../../database/mysql/curriculum/CurriculumQuestionModel";
import CurriculumQuestionBankModel from "../../database/mysql/curriculum/CurriculumQuestionBankModel";
import OperationService from "../operation/OperationService";
import StdObject from "../../wrapper/std-object";
import ServiceConfig from "../service-config";
import CurriculumEducationModel from "../../database/mysql/curriculum/CurriculumEducationModel";

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

  getCurriculumSurveyModel(database) {
    if (database) {
      return new CurriculumQuestionModel(database);
    }
    return new CurriculumQuestionModel(DBMySQL);
  }

  getQuestionBankModel(database) {
    if (database) {
      return new CurriculumQuestionBankModel(database);
    }
    return new CurriculumQuestionBankModel(DBMySQL);
  }

  createCurriculumIntro = async (database, group_auth, request_body) => {
    const curriculum_model = this.getCurriculumModel(database)
    const question_data = request_body.body.param;
    question_data.content_id = Util.getContentId()
    return await curriculum_model.createCurriculum(question_data)
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
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
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
    const thumbnail_url_prefix = ServiceConfig.get('static_storage_prefix') + thumbnail_path

    return {
      thumbnail_path,
      thumbnail_directory,
      thumbnail_url_prefix,
    }
  }

  getCurriculumList = async (database, _group_seq, req) => {
    const request_body = req.query ? req.query : {}
    const page = request_body.page ? request_body.page : null
    const group_seq = request_body.group_seq ? request_body.group_seq : _group_seq
    const request_paging = request_body.paging ? JSON.parse(request_body.paging) : {}
    const request_order = request_body.order ? JSON.parse(request_body.order) : null
    const search_option = request_body.search_option ? request_body.search_option : null
    const search_keyword = request_body.search_keyword ? request_body.search_keyword : null

    const filters = {
      group_seq,
    }

    const curriculum_model = this.getCurriculumModel(database)
    return await curriculum_model.getCurriculumList(filters, request_paging, request_order)
  }

  getCurriculum = async (database, api_type, api_key) => {
    const curriculum_model = this.getCurriculumModel(database)
    return await curriculum_model.getCurriculum(api_key)
  }
  getCurriculumEducation = async (database, api_type, api_key) => {
    const curriculum_model = this.getCurriculumEducationModel(database)
    return await curriculum_model.getCurriculumEducation(api_key)
  }
  getCurriculumSurvey = async (database, api_type, api_key) => {
    const curriculum_model = this.getCurriculumSurveyModel(database)
    return await curriculum_model.getCurriculumSurvey(api_key)
  }
}

const curriculum_service_class = new CurriculumServiceClass()

export default curriculum_service_class
