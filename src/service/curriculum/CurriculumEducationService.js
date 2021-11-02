import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";
import CurriculumEducationModel from "../../database/mysql/curriculum/CurriculumEducationModel";
import data from "../../routes/v1/data";

const CurriculumEducationServiceClass = class {
  constructor() {
    this.log_prefix = '[CurriculumEducationServiceClass]'
  }

  getCurriculumEducationModel(database) {
    if (database) {
      return new CurriculumEducationModel(database);
    }
    return new CurriculumEducationModel(DBMySQL);
  }

  getCurriculumEducation = async (database, curriculum_seq) => {
    const edu_model = this.getCurriculumEducationModel(database)
    return edu_model.getCurriculumEducation(curriculum_seq)
  }

  addCurriculumEducation = async (database, request) => {
    const edu_model = this.getCurriculumEducationModel(database);
    const edu_list = await edu_model.getCurriculumEducationLastSort(request.curriculum_seq);
    if (edu_list) {
      request.sort = Number(edu_list.sort) + 1;
    }
    return await edu_model.addCurriculumEducation(request);
  }
}

const curriculum_education_service = new CurriculumEducationServiceClass()

export default curriculum_education_service
