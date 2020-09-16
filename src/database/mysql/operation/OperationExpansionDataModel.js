import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'

export default class OperationExpansionDataModel extends MySQLModel {
  constructor (...args) {
    super(...args)

    this.table_name = 'operation_expansion_data'
    this.selectable_fields = ['*']
  }

  createOperationExpansionData = async (create_params) => {
    return await this.create(create_params, 'seq')
  }

  getOperationExpansionData = async (filters) => {
    return await this.findOne(filters)
  }

  updateOperationExpansionData = async (filters, update) => {
    update.modify_date = this.database.raw('NOW()')
    return await this.update(filters, update)
  }

  deleteOperationExpansionData = async (filters) => {
    return this.delete(filters)
  }

  getListResult = async (sub_query, page_query) => {
    const count = Util.parseInt(page_query.count, 0)
    const page = Util.parseInt(page_query.page, 0) - 1
    const page_info = {
      'use_paging': false,
      'total_count': 0,
      'total_page': 0,
      'current_page': 0,
      'first_page': 0,
      'last_page': 0,
      'list_count': 0
    }
    if (count) {
      const count_query = this.database.from(sub_query.clone().as('list')).count('* as total_count').first()
      const { total_count } = await count_query
      const total_page = Math.ceil(total_count / count) || 1
      sub_query.limit(count)
      if (page >= 0) {
        sub_query.offset(count * page)
      }
      page_info.total_count = total_count
      page_info.total_page = total_page
      page_info.current_page = page + 1
      page_info.first_page = 1
      page_info.last_page = total_page
      page_info.list_count = count
      page_info.use_paging = true
    }
    sub_query.as('E')

    const field_list = [
      'E.*',
      'operation.operation_name', 'operation.operation_date', this.database.raw('operation.reg_date as operation_reg_date'), 'operation.hour', 'operation.minute',
      'operation_media.thumbnail', 'operation_media.total_time', this.database.raw('operation_media.height as media_height'),
      'member.user_nickname', 'member.user_id'
    ]

    const query = this.database.select(field_list)
    query.from(sub_query)
    query.innerJoin('operation', 'operation.seq', 'E.operation_seq')
    query.innerJoin('member', 'member.seq', 'operation.member_seq')
    query.innerJoin('operation_media', 'operation_media.operation_seq', 'operation.seq')

    const query_result = await query
    if (page_info.use_paging) {
      let list_no = page_info.total_count - count * page
      for (let i = 0; i < query_result.length; i++) {
        const row = query_result[i]
        row.list_no = list_no--
      }
    }
    return { 'data_list': query_result, page_info }
  }

  getOperationExpansionDataList = async (code, search, page_query = {}) => {
    const sub_query = this.database.select(['*'])
      .from(this.table_name)
      .where('view_permission', '>', 0)
    if (code) {
      sub_query.andWhere(code, '>', 0)
    }
    if (search !== null) {
      sub_query.andWhereRaw('MATCH(doc) AGAINST(? IN BOOLEAN MODE)', search)
    }
    if (page_query.order) {
      sub_query.orderBy(page_query.order)
    }

    return await this.getListResult(sub_query, page_query)
  }

  getNewlyExpansionDataList = async (code = null, page_query = {}) => {
    const order_by = [
      { column: 'modify_date', order: 'desc' },
      { column: 'reg_date', order: 'desc' }
    ]
    const sub_query = this.database.select(['*'])
      .from(this.table_name)
      .where('view_permission', '>', 0)
      .andWhere('is_write_doc', '=', 1)
    if (code) {
      sub_query.andWhere(code, '>', 0)
    }
    sub_query.orderBy(order_by)

    return await this.getListResult(sub_query, page_query)
  }

  getNoDocExpansionDataList = async (code = null, page_query = {}) => {
    const order_by = [
      { column: 'modify_date', order: 'desc' },
      { column: 'reg_date', order: 'desc' }
    ]
    const sub_query = this.database.select(['*'])
      .from(this.table_name)
      .where('view_permission', '>', 0)
      .andWhere('is_write_doc', '=', 0)
    if (code) {
      sub_query.andWhere(code, '>', 0)
    }
    sub_query.orderBy(order_by)

    return await this.getListResult(sub_query, page_query)
  }
}
