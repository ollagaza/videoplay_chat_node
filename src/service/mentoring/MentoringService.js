import _ from 'lodash'
import DBMySQL from '../../database/knex-mysql'
import MentoringModel from '../../database/mysql/mentoring/MentoringModel'
import MongoDataService from '../common/MongoDataService'

const MentoringServiceClass = class {
  constructor () {
    this.log_prefix = '[MentoringServiceClass]'
  }

  getMentoring_Model = (database = null) => {
    if (database) {
      return new MentoringModel(database)
    }
    return new MentoringModel(DBMySQL)
  }

  getOpenMentoCategorys = async (database) => {
    try {
      const database_model = this.getMentoring_Model(database)
      const result = await database_model.getOpenMentoCategorys()
      const medical = MongoDataService.getMedicalInfo()
      const mergeResult = []
      _.forEach(result, (item) => {
        if ((_.filter(medical, { code: item.code })).length !== 0) {
          mergeResult.push((_.filter(medical, { code: item.code }))[0])
        }
      })
      return mergeResult
    } catch (e) {
      throw e
    }
  }

  getBestMentoringLists = async (database, category_code, group_seq) => {
    try {
      const database_model = this.getMentoring_Model(database)
      const result = database_model.getBestMentoringLists(category_code, group_seq)
      return result
    } catch (e) {
      throw e
    }
  }
  getRecommendMentoringLists = async (database, category_code) => {
    try {
      const database_model = this.getMentoring_Model(database)
      const result = database_model.getRecommendMentoringLists(category_code)
      return result
    } catch (e) {
      throw e
    }
  }
  getSearchMentoringLists = async (database, sSearch) => {
    try {
      const database_model = this.getMentoring_Model(database)
      const result = database_model.getSearchMentoringLists(sSearch)
      return result
    } catch (e) {
      throw e
    }
  }

  getOperationMentoReceiveList = async (database, group_seq) => {
    try {
      const database_model = this.getMentoring_Model(database)
      const result = database_model.getOperationMentoReceiveList(group_seq)
      return result
    } catch (e) {
      throw e
    }
  }
}

const mentoring_service = new MentoringServiceClass()

export default mentoring_service
