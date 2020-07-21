import Util from '../../utils/baseutil'
import log from "../../libs/logger"
import DBMySQL from '../../database/knex-mysql'

import ContentCountsModel from '../../database/mysql/member/ContentCountsModel'

const ContentCountServiceClass = class {
  constructor () {
    this.log_prefix = '[ContentCountService]'
    this.field_name_map = {
      video_cnt: true,
      community_cnt: true,
      mentoring_cnt: true
    }
    this.CATEGORY_ALL = 'all'
    this.VIDEO_COUNT = 'video_cnt'
    this.COMMUNITY_COUNT = 'community_cnt'
    this.MENTORING_COUNT = 'mentoring_cnt'
    this.SORT_NUMBER = 'sort_num'
  }

  getContentCountsModel = (database = null) => {
    if (database) {
      return new ContentCountsModel(database)
    }
    return new ContentCountsModel(DBMySQL)
  }

  addContentCount = async (database, category_code, group_seq, update_field) => {
    const content_count_model = this.getContentCountsModel(database)
    const create_result = await content_count_model.createContentCount(category_code, group_seq)
    if (create_result) {
      await content_count_model.addContentCount(category_code, group_seq, update_field)
    }
  }

  minusContentCount = async (database, category_code, group_seq, update_field) => {
    const content_count_model = this.getContentCountsModel(database)
    const create_result = await content_count_model.createContentCount(category_code, group_seq)
    if (create_result) {
      await content_count_model.minusContentCount(category_code, group_seq, update_field)
    }
  }

  updateAllCount = async (database, group_seq) => {
    const content_count_model = this.getContentCountsModel(database)
    const create_result = await content_count_model.createContentCount(this.CATEGORY_ALL, group_seq)
    if (create_result) {
      const total_count_info = await content_count_model.getGroupTotalCount(group_seq)
      if (total_count_info) {
        await content_count_model.setContentCount(this.CATEGORY_ALL, group_seq, total_count_info)
      }
    }
  }

  updateSortNumber = async (database, category_code, group_seq, sort_number) => {
    const content_count_model = this.getContentCountsModel(database)
    const create_result = await content_count_model.createContentCount(category_code, group_seq)
    if (create_result) {
      const update_field = {}
      update_field[this.SORT_NUMBER] = sort_number
      await content_count_model.setContentCount(category_code, group_seq, update_field)
    }
  }
}

const content_count_service = new ContentCountServiceClass()
export default content_count_service
