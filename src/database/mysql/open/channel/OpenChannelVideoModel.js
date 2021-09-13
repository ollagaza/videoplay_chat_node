import MySQLModel from '../../../mysql-model'
import OpenChannelVideoInfo from '../../../../wrapper/open/channel/OpenChannelVideoInfo'
import _ from 'lodash'


const default_field_list = ['open_channel_video.*', 'operation_data.title', 'operation_data.doc_html', 'operation_data.thumbnail', 'operation_data.total_time']
const media_field_list = _.concat(default_field_list, ['operation_media.video_file_name', 'operation_media.proxy_file_name', 'operation_media.stream_url'])

export default class OpenChannelVideoModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'open_channel_video'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelVideoModel]'
  }

  getOpenChannelVideoList = async (group_seq, category_seq) => {
    const result_list = []

    const query = this.database
      .select(default_field_list)
      .from(this.table_name)
      .innerJoin('operation_data', { 'operation_data.operation_seq': 'operation_data.operation_seq' })
      .where('open_channel_video.group_seq', group_seq)
      .where('open_channel_video.category_seq', category_seq)
      .orderBy('video_reg_date', 'asc')

    const query_result = await query
    if (query_result && query_result.length) {
      for (let i = 0; i < query_result.length; i++) {
        result_list.push(new OpenChannelVideoInfo(query_result[i]).getOpenVideoInfo())
      }
    }

    return result_list
  }

  createOpenChannelVideoInfo = async (video_info) => {
    const video_seq = await this.create(video_info.getQueryJson(), 'seq')
    return this.getOpenChannelVideoInfo(video_seq)
  }

  getOpenChannelVideoInfo = async (video_seq, join_media = false) => {
    const query = this.database
      .select(join_media ? media_field_list : default_field_list)
      .from(this.table_name)
      .innerJoin('operation_data', { 'operation_data.operation_seq': 'operation_data.operation_seq' })
    if (join_media) {
      query.innerJoin('operation_media', { 'operation_media.operation_seq': 'operation_data.operation_seq' })
    }
    query.where('open_channel_video.seq', video_seq)
      .first()
    const video_info = await query
    return new OpenChannelVideoInfo(video_info).getOpenVideoInfo()
  }

  deleteOpenChannelVideoInfo = async (category_seq, video_seq) => {
    return this.delete({ seq: video_seq, category_seq })
  }
}
