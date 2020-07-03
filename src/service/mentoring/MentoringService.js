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

  getMentoringLists = async (database, category_code, group_seq) => {
    const database_model = this.getContent_Counts_Model(database);
    const result = database_model.getMentoringLists(category_code, group_seq);
    return result
  }
}

const mentoring_service = new MentoringServiceClass()

export default mentoring_service
