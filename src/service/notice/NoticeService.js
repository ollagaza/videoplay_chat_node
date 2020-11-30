import DBMySQL from '../../database/knex-mysql'
import NoticeModel from '../../database/mysql/notice/NoticeModel'
import NoticeFileModel from '../../database/mysql/notice/NoticeFileModel'
import Util from '../../utils/baseutil'
import JsonWrapper from '../../wrapper/json-wrapper'
import NoticeInfo from '../../wrapper/notice/NoticeInfo'
import StdObject from '../../wrapper/std-object'

const NoticeServiceClass = class {
  constructor () {
    this.log_prefix = '[NoticeService]'
  }

  getNoticeModel = (database = null) => {
    if (database) {
      return new NoticeModel(database)
    }
    return new NoticeModel(DBMySQL)
  }

  getNoticeFileModel = (database = null) => {
    if (database) {
      return new NoticeFileModel(database)
    }
    return new NoticeFileModel(DBMySQL)
  }

  getNoticeList = async (request, is_admin_page = false) => {
    const notice_model = this.getNoticeModel()
    const request_query = request.query ? request.query : {}
    const page = Util.parseInt(request_query.page, 1)
    const limit = Util.parseInt(request_query.limit, 20)
    const search = request_query.search ? request_query.search : null
    const search_type = request_query.search_type ? request_query.search_type : 'all'

    const search_options = {
      page,
      limit,
      search,
      search_type
    }
    const notice_list = []
    const query_result = await notice_model.getNoticeList(search_options, is_admin_page)
    if (query_result && query_result.length) {
      for (let i = 0; i < query_result.length; i++) {
        notice_list.push(new JsonWrapper(query_result[i]))
      }
    }
    return notice_list
  }

  createNotice = async (request_body) => {
    const create_params = new NoticeInfo(request_body)
    if (create_params.isEmpty()) {
      throw new StdObject(1, '공지 내용이 없습니다.', 400)
    }
    const notice_model = this.getNoticeModel()
    return await notice_model.createNotice(create_params)
  }


}

const NoticeService = new NoticeServiceClass()

export default NoticeService
