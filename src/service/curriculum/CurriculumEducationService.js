import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";
import CurriculumEducationModel from "../../database/mysql/curriculum/CurriculumEducationModel";

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
}

const curriculum_education_service = new CurriculumEducationServiceClass()

export default curriculum_education_service
