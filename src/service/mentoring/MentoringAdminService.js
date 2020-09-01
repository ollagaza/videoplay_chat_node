import _ from 'lodash'
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MentoringModel from "../../database/mysql/mentoring/MentoringModel";
import ContentCountsModel from "../../database/mysql/member/ContentCountsModel";
import baseutil from "../../utils/baseutil";
import MongoDataService from "../common/MongoDataService";

const MentoringAdminServiceClass = class {
  constructor() {
    this.log_prefix = '[MentoringServiceClass]'
  }

  getMentoring_Model  = (database = null) => {
    if (database) {
      return new MentoringModel(database)
    }
    return new MentoringModel(DBMySQL)
  }

  getCategoryForBestMentos = async (database, category_code) => {
    try {
      const database_model = this.getMentoring_Model(database);
      const result = database_model.getCategoryForBestMentos_withAdmin(category_code);
      return result
    } catch (e) {
      throw e;
    }
  }

  getAllMentoList = async (database, search_keyword, page_navigation, category_code) => {
    try {
      const database_model = this.getMentoring_Model(database);
      const result = database_model.getAllMentoList_withAdmin(search_keyword, page_navigation, category_code);
      return result
    } catch (e) {
      throw e;
    }
  }

  chkBestMento = async (database, category_code, best_num) => {
    try {
      const database_model = this.getMentoring_Model(database)
      const result = database_model.rtnBestMento(category_code, best_num)
      return result
    } catch (e) {
      throw e;
    }
  }

  updateBestMento = async (database, filters, best_num) => {
    try {
      const database_model = this.getMentoring_Model(database)
      let result = null
      if (filters.group_seq.length > 1) {
        for (let cnt = 0; cnt < filters.group_seq.length; cnt++) {
          result = database_model.updateBestMento(filters.category_code, filters.group_seq[cnt], best_num)
        }
      } else {
        result = database_model.updateBestMento(filters.category_code, filters.group_seq, best_num)
      }
      return result
    } catch (e) {
      throw e;
    }
  }
}

const mentoring_admin_service = new MentoringAdminServiceClass()

export default mentoring_admin_service
