import MySQLModel from '../../../mysql-model'
import OpenChannelCategoryInfo from '../../../../wrapper/open/channel/OpenChannelCategoryInfo'

export default class OpenChannelCategoryModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'open_channel_category'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelCategoryModel]'
  }

  getOpenChannelCategoryList = async (group_seq) => {
    const result_list = []

    const query_result = await this.find({ group_seq }, null, { name: 'order', direction: 'asc' })
    if (query_result && query_result.length) {
      for (let i = 0; i < query_result.length; i++) {
        result_list.push(new OpenChannelCategoryInfo(query_result[i]))
      }
    }

    return result_list
  }

  createOpenChannelCategoryInfo = async (category_info) => {
    const category_seq = await this.create(category_info.getQueryJson(), 'seq')
    return this.getOpenChannelCategoryInfo(category_seq)
  }

  getOpenChannelCategoryInfo = async (category_seq) => {
    const category_info = await this.findOne({ seq: category_seq })
    return new OpenChannelCategoryInfo(category_info)
  }

  modifyCategoryName = async (group_seq, category_seq, category_name) => {
    return this.update({ group_seq, seq: category_seq }, { category_name })
  }

  modifyCategoryOrder = async (group_seq, order_data_list) => {
    if (!order_data_list || !order_data_list.length) return

    let query_str = `
      UPDATE ${this.table_name} O
      JOIN (`

    for (let i = 0; i < order_data_list.length; i++) {
      const order_data = order_data_list[i]
      if (i !== 0) {
        query_str += `
        UNION ALL`
      }
      query_str += `
        SELECT ${order_data.seq} AS category_seq, ${order_data.order} AS new_order`
    }

    query_str += `
      ) D
        ON O.seq = D.category_seq
      SET O.order = D.new_order,
        O.modify_date = NOW()
      WHERE O.group_seq = '${group_seq}'
    `

    return this.rawQueryUpdate(query_str)
  }

  deleteOpenChannelCategoryInfo = async (group_seq, category_seq) => {
    return this.delete({ seq: category_seq, group_seq })
  }

  setCategoryVideoCount = async (group_seq, category_seq) => {
    const query_str = `
      UPDATE ${this.table_name} O
      JOIN (
        SELECT category_seq, COUNT(*) AS cnt
        FROM open_channel_video
        WHERE group_seq = '${group_seq}'
          AND category_seq = '${category_seq}'
        GROUP BY category_seq
      ) AS D
        ON O.seq = D.category_seq
      SET O.order = D.new_order,
        O.modify_date = NOW()
      WHERE O.group_seq = '${group_seq}'
        AND O.seq = '${category_seq}'
    `

    return this.rawQueryUpdate(query_str)
  }
}
