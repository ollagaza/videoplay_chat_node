import JsonWrapper from '../../json-wrapper'
import ServiceConfig from '../../../service/service-config'
import Util from '../../../utils/Util'

export default class OpenChannelInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.log_prefix = '[OpenChannelInfo]'
  }

  getOpenChannelInfo = () => {
    this.setKeys([
      'channel_name', 'explain', 'member_count', 'tag_list', 'group_image_url', 'profile_image_url', 'channel_top_img_url',
      'order', 'video_count', 'recommend_count', 'comment_count', 'view_count',
      'recent_list', 'most_view_list', 'most_recommend_list', 'most_comment_list',
      'recent_open_video_date', 'channel_open_date'
    ])

    this.stringFieldToJson('search_keyword', {}, true, 'tag_list')
    this.stringFieldToJson('recent_list', [])
    this.stringFieldToJson('recent_list', [])
    this.stringFieldToJson('most_view_list', [])
    this.stringFieldToJson('most_recommend_list', [])
    this.stringFieldToJson('most_comment_list', [])

    this.channel_name =  Util.trim(this.group_name)
    this.explain =  Util.trim(this.group_explain)
    this.member_count =  Util.parseInt(this.member_count)
    if (this.profile) {
      this.group_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), JSON.parse(this.profile).image)
    }
    if (this.profile_image_path) {
      this.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), this.profile_image_path)
    }
    if (this.channel_top_img_url) {
      this.channel_top_img_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), this.channel_top_img_path)
    }

    return this
  }
}
