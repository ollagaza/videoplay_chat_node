import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'

export default class NoticeModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'notice'
    this.selectable_fields = ['*']
    this.log_prefix = '[NoticeModel]'
    this.list_fields = [
      'notice.seq', 'notice.subject', 'notice.contents', 'notice.view_count', 'notice.is_pin',
      'notice.is_limit', 'notice.start_date', 'notice.end_date', 'notice.code',
      'notice.reg_date', 'notice.end_date', 'member.user_name', 'member.user_nickname'
    ]
  }

  createNotice = async (notice_info) => {
    notice_info.setIgnoreEmpty(true)
    const create_params = notice_info.toJSON()
    return this.create(create_params, 'seq')
  }

  getNotice = async (notice_seq) => {
    const query = this.database.select(this.list_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'notice.member_seq': 'member.seq' })
    query.where('notice.seq', notice_seq)
    return query
  }

  getNoticeByCode = async (code) => {
    const query = this.database.select(this.list_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'notice.member_seq': 'member.seq' })
    query.where('notice.code', code)
    return query
  }

  getNoticeList = async (options, is_admin_page = false) => {
    const page = options.page
    const limit = options.limit
    const search = options.search
    const search_type = options.search_type
    const today = Util.today('yyyymmdd')

    const query = this.database.select(this.list_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'notice.member_seq': 'member.seq' })
    if (!is_admin_page) {
      query.where((builder) => {
        builder.where('notice.is_limit', 0)
        builder.orWhere((orBuilder) => {
          orBuilder.where('notice.is_limit', 1)
            .where('notice.start_date', '<=', today)
            .where('notice.end_date', '>=', today)
        })
      })
    }
    if (search) {
      if (search_type === 'subject') {
        query.where('notice.subject', 'like', `%${search}%`)
      } else if (search_type === 'context') {
        query.where('notice.context_text', 'like', `%${search}%`)
      } else {
        query.whereRaw('MATCH (notice.subject, notice.context_text) AGAINST (? IN BOOLEAN MODE)', `${search}*`)
      }
    }
    query.orderBy([{ column: 'notice.is_pin', order: 'desc' }, { column: 'notice.seq', order: 'desc' }])
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

  updateViewCount = async (notice_seq) => {
    const update_params = {
      view_count: this.database.raw('`view_count` + 1')
    }
    return this.update({ notice_seq }, update_params)
  }
}
