import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import ContentCountsModel from "../../database/mysql/member/ContentCountsModel";

const MentoringServiceClass = class {
  constructor() {
    this.log_prefix = '[MentoringServiceClass]'
  }

  getContent_Counts_Model  = (database = null) => {
    if (database) {
      return new ContentCountsModel(database)
    }
    return new ContentCountsModel(DBMySQL)
  }

  getBestMentoringLists = async (database, category_code, group_seq) => {
    try {
      const database_model = this.getContent_Counts_Model(database);
      const result = database_model.getBestMentoringLists(category_code, group_seq);
      return result
    } catch (e) {
      throw e;
    }
  }
  getRecommendMentoringLists = async (database, category_code) => {
    try {
      const database_model = this.getContent_Counts_Model(database);
      const result = database_model.getRecommendMentoringLists(category_code);
      return result
    } catch (e) {
      throw e;
    }
  }
  getSearchMentoringLists = async (database, sSearch) => {
    try {
      const database_model = this.getContent_Counts_Model(database);
      const result = database_model.getSearchMentoringLists(sSearch);
      return result
    } catch (e) {
      throw e;
    }
  }
}

const mentoring_service = new MentoringServiceClass()

export default mentoring_service
