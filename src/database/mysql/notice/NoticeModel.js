import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'

export default class NoticeModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'notice'
    this.selectable_fields = ['*']
    this.log_prefix = '[NoticeModel]'
    this.list_fields = [
      'notice.seq', 'notice.subject', 'notice.view_count', 'notice.is_pin', 'notice.is_open', 'notice.is_delete', `notice.attach_file_count`,
      'notice.code', 'notice.reg_date', 'notice.modify_date', 'notice.is_limit', 'notice.start_date', 'notice.end_date',
      'member.user_id', 'member.user_name', 'member.user_nickname'
    ]
    this.view_fields = [
      'notice.seq', 'notice.subject', 'notice.contents', 'notice.view_count', 'notice.is_open', 'notice.is_pin',
      'notice.is_limit', 'notice.start_date', 'notice.end_date', 'notice.code', 'notice.contents_only',
      'notice.reg_date', 'notice.modify_date', 'member.user_id', 'member.user_name', 'member.user_nickname'
    ]
  }

  createNotice = async (notice_info) => {
    notice_info.modify_date = this.database.raw('NOW()')
    return this.create(notice_info, 'seq')
  }

  getNotice = async (notice_seq) => {
    const query = this.database.select(this.view_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'notice.member_seq': 'member.seq' })
    query.where('notice.seq', notice_seq)
    query.first()

    return query
  }

  getNoticeByCode = async (code) => {
    const query = this.database.select(this.view_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'notice.member_seq': 'member.seq' })
    query.where('notice.code', code)
    query.orderBy([{ column: 'notice.seq', order: 'desc' }])
    query.first()

    return query
  }

  getNoticeList = async (options, is_admin = false) => {
    const page = options.page
    const limit = options.limit
    const search = options.search
    const search_type = options.search_type
    const order = options.order
    const order_id = options.order_id
    const today = Util.today('yyyymmdd')

    const query = this.database.select(this.list_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'notice.member_seq': 'member.seq' })
    if (!is_admin) {
      query.where('is_open', 1)
      query.where('is_delete', 0)
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
        query.where('notice.contents_text', 'like', `%${search}%`)
      } else {
        query.whereRaw('MATCH (notice.subject, notice.contents_text) AGAINST (? IN BOOLEAN MODE)', `${search}*`)
      }
    }
    if (!order_id) {
      query.orderBy([{ column: 'notice.is_pin', order: 'desc' }, { column: 'notice.seq', order: 'desc' }])
    } else {
      query.orderBy([{ column: 'notice.is_pin', order: 'desc' }, { column: `notice.${order_id}`, order }])
    }

    return this.queryPaginated(query, limit, page)
  }

  updateNotice = async (notice_seq, notice_info) => {
    notice_info.modify_date = this.database.raw('NOW()')
    return this.update({ seq: notice_seq }, notice_info)
  }

  deleteNotice = async (notice_seq) => {
    return this.delete({ seq: notice_seq })
  }

  deleteNoticeBySeqList = async (seq_list) => {
    return this.database.from(this.table_name)
      .whereIn('seq', seq_list)
      .del()
  }

  setNoticeDeleteBySeqList = async (seq_list) => {
    return this.database
      .update({ is_delete: 1 })
      .from(this.table_name)
      .whereIn('seq', seq_list)
  }

  updateAttachFileCount = async (notice_seq, attach_file_count) => {
    const update_params = {
      attach_file_count
    }
    return this.update({ seq: notice_seq }, update_params)
  }

  updateViewCount = async (notice_seq) => {
    const update_params = {
      view_count: this.database.raw('`view_count` + 1')
    }
    return this.update({ seq: notice_seq }, update_params)
  }
}
