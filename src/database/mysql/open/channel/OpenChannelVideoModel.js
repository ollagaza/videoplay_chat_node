import MySQLModel from '../../../mysql-model'
import OpenChannelVideoInfo from '../../../../wrapper/open/channel/OpenChannelVideoInfo'
import _ from 'lodash'
import Util from '../../../../utils/Util'


const default_field_list = [
  'open_channel_video.seq AS video_seq', 'open_channel_video.category_seq', 'open_channel_video.view_count',
  'operation_data.seq AS data_seq', 'operation_data.group_seq', 'operation_data.operation_seq', 'operation_data.thumbnail', 'operation_data.total_time', 'operation_data.is_play_limit', 'operation_data.play_limit_time',
  'operation.reg_date', 'operation.operation_date', 'operation.mode',
  'IF(open_channel_video.video_title IS NOT NULL, open_channel_video.video_title, operation_data.title) AS title',
  'IF(open_channel_video.video_doc_html IS NOT NULL, open_channel_video.video_doc_html, operation_data.doc_html) AS html',
  'IF(open_channel_video.video_doc_text IS NOT NULL, open_channel_video.video_doc_text, operation_data.doc_text) AS text'
]
const media_field_list = _.concat(default_field_list, ['operation_media.video_file_name', 'operation_media.proxy_file_name', 'operation_media.stream_url'])

export default class OpenChannelVideoModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'open_channel_video'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelVideoModel]'
  }

  getOpenChannelVideoList = async (group_seq, is_all, category_seq, page_params = {}, filter_params = {}, order_params = {}) => {
    const sub_query = this.database
      .select(this.arrayToSafeQuery(default_field_list))
    if (is_all) {
      sub_query.from('operation_data')
        .innerJoin('operation', (builder) => {
          this.setOperationJoinOption(builder, 'operation_data.operation_seq')
        })
        .leftOuterJoin('open_channel_video', { 'operation_data.operation_seq': 'open_channel_video.operation_seq' })
    } else {
      sub_query.from('open_channel_video')
        .innerJoin('operation', (builder) => {
          this.setOperationJoinOption(builder, 'open_channel_video.operation_seq')
        })
        .innerJoin('operation_data', { 'operation_data.operation_seq': 'open_channel_video.operation_seq' })
    }

    sub_query.where('operation_data.group_seq', group_seq)

    if (is_all) {
      sub_query.where(builder => {
        builder.where('operation_data.is_open_video', 1)
        builder.orWhereNotNull('open_channel_video.seq')
      })
    } else {
      sub_query.where('open_channel_video.category_seq', category_seq)
    }

    const query = this.database
      .select('*')
      .from({ data: sub_query })

    if (filter_params.search_keyword) {
      query.where((builder) => {
        builder.where('title', 'like', `%${filter_params.search_keyword}%`)
        builder.orWhere('text', 'like', `%${filter_params.search_keyword}%`)
      })
    }

    const order_by = { name: 'operation_seq', direction: 'DESC' }
    if (order_params.field) {
      switch (order_params.field) {
        case 'title':
          order_by.name = 'title'
          break;
        case 'operation_date':
          order_by.name = 'operation_date'
          break;
        case 'view_count':
          order_by.name = 'view_count'
          break;
        case 'total_time':
          order_by.name = 'total_time'
          break;
        default:
          order_by.name = 'operation_seq'
          break;
      }
    }
    if (order_params.type) {
      order_by.direction = order_params.type
    }
    query.orderBy(order_by.name, order_by.direction)

    const page = page_params.page ? page_params.page : 1
    const list_count = page_params.list_count ? page_params.list_count : 20
    const page_count = page_params.page_count ? page_params.page_count : 10
    const paging_result = await this.queryPaginated(query, list_count, page, page_count, page_params.no_paging)

    if (paging_result && paging_result.data) {
      for (const key in paging_result.data) {
        paging_result.data[key] = new OpenChannelVideoInfo(paging_result.data[key]).getOpenVideoInfo()
      }
    }
    return paging_result
  }

  setOperationJoinOption = (builder, operation_seq_column) => {
    builder.andOn('operation.seq', operation_seq_column)
    builder.andOn(this.database.raw("operation.mode = 'operation'"))
    builder.andOn(this.database.raw("operation.status = 'Y'"))
    builder.andOn(this.database.raw("operation.analysis_status = 'Y'"))
  }

  createOpenChannelVideoInfo = async (video_info) => {
    const video_seq = await this.create(video_info.getQueryJson(), 'seq')
    return this.getOpenChannelVideoInfo(video_seq)
  }

  getOpenChannelVideoInfo = async (operation_seq, join_media = false) => {
    const query = this.database
      .select(join_media ? media_field_list : default_field_list)
      .from(this.table_name)
      .innerJoin('operation_data', { 'operation_data.operation_seq': operation_seq })
      .innerJoin('open_channel_video', { 'open_channel_video.operation_seq': operation_seq })
    if (join_media) {
      query.innerJoin('operation_media', { 'operation_media.operation_seq': operation_seq })
    }
    query.where('operation.seq', operation_seq)
      .first()
    const video_info = await query
    return new OpenChannelVideoInfo(video_info).getOpenVideoInfo()
  }

  deleteOpenChannelVideoInfo = async (video_seq) => {
    return this.delete({ seq: video_seq })
  }
}
