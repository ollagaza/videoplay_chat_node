import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'

export default class NoticeModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'notice'
    this.selectable_fields = ['*']
    this.log_prefix = '[NoticeModel]'
  }

  createNotice = async (notice_info) => {
    notice_info.setIgnoreEmpty(true)
    const create_params = notice_info.toJSON()
    return this.create(create_params, 'seq')
  }

  getNotice = async (notice_seq) => {
    return this.findOne({ seq: notice_seq })
  }

  getNoticeByCode = async (code) => {
    return this.findOne({ code })
  }

  getNoticeList = async (options, is_admin_page = false) => {
    const page = Util.getInt(options.page, 1)
    const limit = Util.getInt(options.limit, 20)
    const today = Util.today('yyyymmdd')
    const search = options.search ? Util.trim(options.search) : null

    const query = this.database.select(this.selectable_fields)
    query.from(this.table_name)
    if (!is_admin_page) {
      query.where({ is_limit: 0 })
      query.orWhere((builder) => {
        builder.where('is_limit', 1)
          .where('start_date', '<=', today)
          .where('end_date', '>=', today)
      })
    }
    if (search) {
      query.whereRaw('MATCH (subject, context_text) AGAINST (? IN BOOLEAN MODE)', `${search}*`)
    }
    query.orderBy([{ column: 'is_pin', order: 'desc' }, { column: 'seq', order: 'desc' }])
    query.limit(limit)
    query.offset(limit * (page - 1))

    return query
  }

  updateNotice = async (notice_seq, notice_info) => {
    notice_info.setIgnoreEmpty(true)
    const update_params = notice_info.toJSON()
    update_params.modify_date = this.database.raw('NOW()')
    return this.update({ notice_seq }, update_params)
  }

  updateAttachFileCount = async (notice_seq, attach_file_count) => {
    const update_params = {
      attach_file_count
    }
    return this.update({ notice_seq }, update_params)
  }
}
