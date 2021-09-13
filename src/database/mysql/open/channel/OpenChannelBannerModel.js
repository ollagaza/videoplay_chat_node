import MySQLModel from '../../../mysql-model'

export default class OpenChannelBannerModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'open_channel_banner'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelModel]'
  }

  getOpenChannelBannerList = async (group_seq) => {
    const result_list = []

    const query_result = await this.find({ group_seq }, null, { name: 'order', direction: 'asc' })
    if (query_result && query_result.length) {
      for (let i = 0; i < query_result.length; i++) {
        const result = query_result[i]
      }
    }

    return result_list
  }
}
