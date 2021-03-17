import MySQLModel from '../../mysql-model'

export default class SurgboxUpdateModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'surgbox_update'
    this.selectable_fields = ['*']
    this.log_prefix = '[SurgboxUpdateModel]'
    this.list_fields = [
      'surgbox_update.seq', 'surgbox_update.version', 'surgbox_update.title',
      'surgbox_update.file_path', 'surgbox_update.total_file_count', 'surgbox_update.total_file_size',
      'surgbox_update.is_force', 'surgbox_update.is_hide', 'surgbox_update.reg_date', 'surgbox_update.modify_date',
      'member.user_id', 'member.user_name', 'member.user_nickname'
    ]
    this.view_fields = [
      'surgbox_update.seq', 'surgbox_update.version', 'surgbox_update.title', 'surgbox_update.desc',
      'surgbox_update.file_path', 'surgbox_update.total_file_count', 'surgbox_update.total_file_size',
      'surgbox_update.is_force', 'surgbox_update.is_hide', 'surgbox_update.reg_date', 'surgbox_update.modify_date',
      'member.user_id', 'member.user_name', 'member.user_nickname'
    ]
    this.update_list_fields = [
      'surgbox_update.seq', 'surgbox_update.version', 'surgbox_update.title', 'surgbox_update.desc', 'surgbox_update.file_path', 'surgbox_update.is_force',
      'surgbox_update.total_file_count', 'surgbox_update.total_file_size', 'surgbox_update_file.file_name', 'surgbox_update_file.file_size',
      'surgbox_update.reg_date', 'surgbox_update.modify_date'
    ]
  }

  createUpdateInfo = async (update_info) => {
    update_info.modify_date = this.database.raw('NOW()')
    return this.create(update_info, 'seq')
  }

  modifyUpdateInfo = async (update_seq, update_info) => {
    update_info.modify_date = this.database.raw('NOW()')
    return this.update({ seq: update_seq }, update_info)
  }

  updateFileSummary = async (update_seq, summary_info) => {
    return this.update({ seq: update_seq }, summary_info)
  }

  getUpdateInfo = async (update_seq) => {
    return this.findOne({ seq: update_seq })
  }

  getUpdateInfoForView = async (update_seq) => {
    const query = this.database
      .select(this.view_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'surgbox_update.member_seq': 'member.seq' })
    query.where('surgbox_update.seq', update_seq)
    query.first()
    return query
  }

  deleteUpdateInfo = async (update_seq) => {
    return this.delete({ seq: update_seq })
  }

  getUpdatePageList = async (options, type = 'box') => {
    const page = options.page
    const limit = options.limit
    const search = options.search
    const order = options.order ? options.order : 'asc'
    const order_id = options.order_id

    const query = this.database.select(this.list_fields)
    query.from(this.table_name)
    query.leftOuterJoin('member', { 'surgbox_update.member_seq': 'member.seq' })
    if (search) {
      query.where('surgbox_update.version', 'like', `%${search}%`)
      query.where('surgbox_update.title', 'like', `%${search}%`)
      query.where('surgbox_update.desc', 'like', `%${search}%`)
      query.where('surgbox_update.user_name', 'like', `%${search}%`)
      query.where('surgbox_update.user_id', 'like', `%${search}%`)
      // query.where('surgbox_update.user_nickname', 'like', `%${search}%`)
    }
    if (type) {
      query.andWhere('type', type)
    } else {
      query.andWhere('type', 'box')
    }
    if (!order_id) {
      query.orderBy([{ column: 'surgbox_update.v1', order }, { column: 'surgbox_update.v2', order }, { column: 'surgbox_update.v3', order }, { column: 'surgbox_update.v4', order }])
    } else {
      query.orderBy([{ column: `surgbox_update.${order_id}`, order }])
    }

    return this.queryPaginated(query, limit, page)
  }

  getUpdateList = async (type = 'box') => {
    const query = this.database.select(this.update_list_fields)
    query.from(this.table_name)
    query.leftOuterJoin('surgbox_update_file', { 'surgbox_update_file.surgbox_update_seq': 'surgbox_update.seq' })
    query.where('is_hide', 0)
    if (type) {
      query.andWhere('type', type)
    } else {
      query.andWhere('type', 'box')
    }
    query.orderBy([{ column: 'surgbox_update.v1', order: 'asc' }, { column: 'surgbox_update.v2', order: 'asc' }, { column: 'surgbox_update.v3', order: 'asc' }, { column: 'surgbox_update.v4', order: 'asc' }, { column: 'surgbox_update_file.file_name', order: 'asc' }])

    return query
  }

  isDuplicateVersion = async (seq, version) => {
    const query = this.database.select([this.database.raw('COUNT(*) AS total_count')])
    query.from(this.table_name)
    query.whereNot('seq', seq)
    query.where('version', version)

    const result = await query
    if (result && result.total_count) {
      return result.total_count > 0
    }

    return false
  }
}
