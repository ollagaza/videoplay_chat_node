import JsonWrapper from '../../json-wrapper'
import ServiceConfig from '../../../service/service-config'
import Util from '../../../utils/Util'
import OperationService from '../../../service/operation/OperationService'

export default class OpenChannelVideoInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.log_prefix = '[OpenChannelVideoInfo]'
  }

  getOpenVideoInfo = (is_member) => {
    this.setKeys([
      'seq', 'group_seq', 'category_seq', 'operation_seq', 'view_count', 'non_user_play_time', 'title', 'doc_html', 'thumbnail', 'total_time', 'reg_date', 'operation_date', 'mode', 'title', 'html', 'text'
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
      const non_user_play_time = Util.parseInt(this.non_user_play_time, 0)
      const is_cut_video = non_user_play_time > 0
      let media_type = 'video/mp4'
      let stream_url = ''

      // logger.debug('[OperationMediaInfo]', 'media_video', media_video, directory_info.media_video, directory_info.media_video_origin)
      if (ServiceConfig.isVacs()) {
        stream_url = ServiceConfig.get('static_storage_prefix') + media_video + this.video_file_name
      } else {
        if (is_member || !is_cut_video) {
          stream_url = ServiceConfig.get('cdn_url') + media_video + this.video_file_name
        } else if (is_cut_video) {
          media_type = 'application/x-mpegURL'
          stream_url = ServiceConfig.get('hls_streaming_url') + '/vodEnd/' + non_user_play_time + media_video + this.video_file_name + '/master.m3u8'
        }
      }
      this.stream_info = {
        type: media_type,
        src: stream_url
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
}
