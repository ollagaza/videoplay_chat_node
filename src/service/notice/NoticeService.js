import DBMySQL from '../../database/knex-mysql'
import NoticeModel from '../../database/mysql/notice/NoticeModel'
import NoticeFileModel from '../../database/mysql/notice/NoticeFileModel'
import Util from '../../utils/baseutil'
import NoticeInfo from '../../wrapper/notice/NoticeInfo'
import StdObject from '../../wrapper/std-object'
import striptags from 'striptags'
import ServiceConfig from '../service-config'
import NoticeFileInfo from '../../wrapper/notice/NoticeFileInfo'
import logger from '../../libs/logger'

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

  getNoticeList = async (request) => {
    const notice_model = this.getNoticeModel()
    const request_query = request.query ? request.query : {}
    const page = Util.parseInt(request_query.page, 1)
    const limit = Util.parseInt(request_query.limit, 20)
    const search = request_query.search ? request_query.search : null
    const search_type = request_query.search_type ? request_query.search_type : 'all'
    const order = request_query.order ? request_query.order : null
    const order_id = request_query.order_id ? request_query.order_id : null
    const is_admin_page = request_query.is_admin_page ? request_query.is_admin_page : false

    const search_options = {
      page,
      limit,
      search,
      search_type,
      order,
      order_id
    }
    return notice_model.getNoticeList(search_options, is_admin_page)
  }

  getNoticeInfoByRequest = (request_body) => {
    const request_info = new NoticeInfo(request_body)
    if (request_info.isEmpty()) {
      throw new StdObject(101, '잘못된 요청입니다.', 400)
    }
    request_info.setIgnoreEmpty(true)
    request_info.setAutoTrim(true)
    if (request_info.start_date) {
      request_info.start_date = `${request_info.start_date}`.replace(/[^\d]/gi, '')
    }
    if (request_info.end_date) {
      request_info.end_date = `${request_info.end_date}`.replace(/[^\d]/gi, '')
    }
    const notice_info = request_info.toJSON()
    if (!notice_info.contents) {
      throw new StdObject(102, '공지 내용이 없습니다.', 400)
    }
    notice_info.contents_text = striptags(notice_info.contents)
    if (!notice_info.subject) {
      throw new StdObject(103, '제목이 없습니다.', 400)
    }
    if (!notice_info.contents) {
      throw new StdObject(102, '공지 내용이 없습니다.', 400)
    }
    notice_info.contents_text = striptags(notice_info.contents)
    if (!notice_info.subject) {
      throw new StdObject(103, '제목이 없습니다.', 400)
    }
    return notice_info
  }

  createNotice = async (member_seq, request_body) => {
    const notice_info = this.getNoticeInfoByRequest(request_body)
    notice_info.member_seq = member_seq
    if (!notice_info.code) {
      notice_info.code = Util.getRandomString(10);
    }
    const notice_model = this.getNoticeModel()
    return notice_model.createNotice(notice_info)
  }

  deleteNotice = async (notice_seq) => {
    const notice_model = this.getNoticeModel()
    const delete_result = await notice_model.deleteNotice(notice_seq)
    this.deleteDirectory(notice_seq)
    return delete_result
  }

  deleteNoticeBySeqList = async (request_body) => {
    if (!request_body || !request_body.seq_list) {
      throw new StdObject(101, '잘못된 요청입니다.', 400)
    }

    const seq_list = request_body.seq_list
    if (seq_list.length > 0) {
      const notice_model = this.getNoticeModel()
      const delete_result = await notice_model.deleteNoticeBySeqList(seq_list)

      for (let i = 0; i < seq_list.length; i++) {
        this.deleteDirectory(seq_list[i])
      }

      return delete_result
    }
    return true
  }

  deleteDirectory = (notice_seq) => {
    (
      async (notice_seq) => {
        try {
          const upload_path = `/notice/${notice_seq}`
          const upload_directory = `${ServiceConfig.get('media_root')}/${upload_path}`
          await Util.deleteDirectory(upload_directory)
        } catch (error) {
          logger.error(this.log_prefix, '[deleteDirectory]', `[notice_seq: ${notice_seq}]`, error)
        }
      }
    )(notice_seq)
  }

  getNotice = async (notice_seq, is_admin) => {
    const notice_model = this.getNoticeModel()
    const notice_data = await notice_model.getNotice(notice_seq)
    return this.getNoticeInfo(notice_data, is_admin)
  }

  getNoticeByCode = async (code, is_admin) => {
    const notice_model = this.getNoticeModel()
    const notice_data = await notice_model.getNoticeByCode(code)
    return this.getNoticeInfo(notice_data, is_admin)
  }

  getNoticeInfo = async (notice_data, is_admin) => {
    const notice_info = new NoticeInfo(notice_data)
    if (notice_info.isEmpty()) {
      throw new StdObject(111, '공지사항이 없습니다.', 400)
    }
    if (!is_admin) {
      if (notice_info.is_limit) {
        const today = Util.today('yyyymmdd')
        if (notice_info.start_date > today || notice_info.end_date < today) {
          throw new StdObject(112, '만료된 게시물입니다.', 400)
        }
      }
      if (!notice_info.is_open) {
        throw new StdObject(113, '비공개 게시물입니다.', 400)
      }
    }
    const notice_seq = notice_info.seq
    const notice_file_model = this.getNoticeFileModel()
    const file_result = await notice_file_model.getFileList(notice_seq)
    const notice_file_list = []
    if (file_result) {
      for (let i = 0; i < file_result.length; i++) {
        const file_info = new NoticeFileInfo(file_result[i])
        file_info.setUrl()
        notice_file_list.push(file_info.toJSON())
      }
    }

    return {
      notice_info,
      notice_file_list
    }
  }

  uploadFile = async (notice_seq, request, response) => {
    logger.debug(this.log_prefix, `{ UPLOAD_ROOT: ${this.UPLOAD_ROOT}, FILE_URL_PREFIX: ${ServiceConfig.get('static_storage_prefix')} }`)
    const upload_path = `/notice/${notice_seq}/`
    const upload_directory = `${ServiceConfig.get('media_root')}/${upload_path}`
    logger.debug(this.log_prefix, '[uploadFile]', `{ notice_seq: ${notice_seq} }`, upload_directory)
    if (!(await Util.fileExists(upload_directory))) {
      await Util.createDirectory(upload_directory)
    }

    const file_field_name = 'notice_file'
    await Util.uploadByRequest(request, response, file_field_name, upload_directory, Util.getRandomId())
    const upload_file_info = request.file
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
    }
    upload_file_info.new_file_name = request.new_file_name
    logger.debug(this.log_prefix, '[uploadFile]', `{ notice_seq: ${notice_seq} }`, 'upload_file_info', upload_file_info)

    const file_info = (await new NoticeFileInfo().getByUploadFileInfo(notice_seq, upload_file_info, upload_path))
    logger.debug(this.log_prefix, '[uploadFile]', `{ notice_seq: ${notice_seq} }`, 'file_info', file_info)

    file_info.setIgnoreEmpty(true)
    const notice_file_model = this.getNoticeFileModel()
    const notice_file_seq = await notice_file_model.createNoticeFile(file_info.toJSON())
    const file_url = `${ServiceConfig.get('static_storage_prefix')}${upload_path}/${upload_file_info.new_file_name}`
    const file_count = await notice_file_model.getFileCount(notice_seq)
    const notice_model = this.getNoticeModel()
    await notice_model.updateAttachFileCount(notice_seq, file_count)
    return {
      notice_file_seq,
      file_url,
      file_count
    }
  }

  modifyNotice = async (notice_seq, request_body) => {
    if (!request_body || !request_body.notice_data) {
      throw new StdObject(131, '잘못된 요청입니다.', 400)
    }
    let update_result = false
    let delete_file_path_list = null
    const notice_info = this.getNoticeInfoByRequest(request_body.notice_data)
    await DBMySQL.transaction(async (transaction) => {
      const notice_model = this.getNoticeModel(transaction)
      update_result = await notice_model.updateNotice(notice_seq, notice_info)
      delete_file_path_list = await this.deleteFileByList(transaction, notice_seq, request_body.delete_file_seq_list)
    });

    if (delete_file_path_list) {
      this.deleteFiles(delete_file_path_list)
    }

    return update_result
  }

  deleteFileByList = async (database, notice_seq, delete_file_seq_list) => {
    if (!delete_file_seq_list || delete_file_seq_list.length < 1) return;
    const delete_file_path_list = []
    for (let i = 0; i < delete_file_seq_list.length; i++) {
      const file_path = await this.deleteFile(database, notice_seq, delete_file_seq_list[i], false)
      delete_file_path_list.push(file_path)
    }
    const notice_file_model = this.getNoticeFileModel(database)
    const file_count = await notice_file_model.getFileCount(notice_seq)
    const notice_model = this.getNoticeModel(database)
    await notice_model.updateAttachFileCount(notice_seq, file_count)

    return delete_file_path_list
  }

  deleteFiles = (file_path_list) => {
    (
      async () => {
        for (let i = 0; i < file_path_list.length; i++) {
          try {
            await Util.deleteFile(file_path_list[i])
          } catch (error) {
            logger.error(this.log_prefix, '[deleteFiles]', file_path_list[i])
          }
        }
      }
    )()
  }

  deleteFile = async (database, notice_seq, notice_file_seq, delete_file = true) => {
    const notice_file_model = this.getNoticeFileModel(database)
    const file_info = await notice_file_model.getNoticeFile(notice_seq, notice_file_seq)
    if (!file_info) return true;

    await notice_file_model.deleteNoticeFile(notice_seq, notice_file_seq)
    const file_path = `${ServiceConfig.get('media_root')}${file_info.file_path}`
    if (delete_file) {
      try {
        await Util.deleteFile(file_path)
      } catch (error) {
        logger.error(this.log_prefix, '[deleteFile]', error)
      }
    }
    return file_path
  }
}

const NoticeService = new NoticeServiceClass()

export default NoticeService
