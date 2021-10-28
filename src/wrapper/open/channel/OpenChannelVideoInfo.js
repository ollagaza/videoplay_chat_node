import JsonWrapper from '../../json-wrapper'
import ServiceConfig from '../../../service/service-config'
import Util from '../../../utils/Util'
import OperationService from '../../../service/operation/OperationService'
import logger from '../../../libs/logger'

export default class OpenChannelVideoInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.log_prefix = '[OpenChannelVideoInfo]'
  }

  getOpenVideoInfo = (is_member) => {
    this.setKeys([
      'video_seq', 'data_seq', 'group_seq', 'category_seq', 'operation_seq', 'view_count',
      'is_play_limit', 'play_limit_time', 'title', 'thumbnail', 'total_time',
      'reg_date', 'operation_date', 'mode', 'html', 'text', 'stream_info', 'media_info', 'open_date'
    ])

    if (this.thumbnail) {
      if (this.mode === 'file' && !ServiceConfig.isVacs()) {
        if (!this.thumbnail.startsWith('/static/')) {
          this.thumbnail = ServiceConfig.get('static_storage_prefix') + this.thumbnail
        }
      } else {
        this.thumbnail = ServiceConfig.get('static_storage_prefix') + this.thumbnail
      }
    }

    if (this.video_file_name) {
      const directory_info = OperationService.getOperationDirectoryInfo(this)
      const media_video = this.origin_seq ? directory_info.media_video_origin : directory_info.media_video
      const is_play_limit = Util.parseInt(this.is_play_limit, 1) === 1
      let play_time_limit = Util.parseInt(this.play_limit_time, 0) * 1000
      if (play_time_limit <= 0) play_time_limit = 1
      let media_type = 'video/mp4'
      let stream_url = ''

      // logger.debug('[OperationMediaInfo]', 'media_video', media_video, directory_info.media_video, directory_info.media_video_origin)
      if (ServiceConfig.isVacs()) {
        stream_url = ServiceConfig.get('static_storage_prefix') + media_video + this.video_file_name
      } else {
        if (is_member || !is_play_limit) {
          stream_url = ServiceConfig.get('cdn_url') + media_video + this.video_file_name
        } else {
          // media_type = 'application/x-mpegURL'
          // stream_url = ServiceConfig.get('hls_streaming_url') + '/vodStart/0/vodEnd/' + play_time_limit * 1000 + media_video + this.video_file_name + '/master.m3u8'
          media_type = 'application/dash+xml'
          stream_url = ServiceConfig.get('dash_streaming_url') + '/vodStart/0/vodEnd/' + play_time_limit + media_video + this.video_file_name + '/manifest.mpd'
        }
      }
      this.stream_info = {
        type: media_type,
        src: stream_url,
        poster: this.thumbnail
      }
      this.media_info = {
        width: this.width,
        height: this.height
      }
    }

    return this
  }

  getQueryJson = () => {
    this.setKeys([
      'seq', 'group_seq', 'category_seq', 'operation_seq', 'video_title', 'video_doc_text', 'video_doc_html', 'non_user_play_time', 'view_count', 'reg_date', 'modify_date'
    ])
    this.setIgnoreEmpty(true)
    return this.toJSON()
  }

  getDataJSON = () => {
    this.setKeys([
      'video_seq', 'operation_seq', 'view_count', 'title', 'thumbnail', 'total_time', 'reg_date', 'open_date'
    ])
    this.setIgnoreEmpty(true)
    return this.toJSON()
  }
}
