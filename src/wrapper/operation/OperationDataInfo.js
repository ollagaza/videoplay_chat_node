import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'

const default_key_list = [
  'seq', 'operation_seq', 'group_seq', 'group_name', 'hospital', 'title', 'view_count', 'total_time',
  'thumbnail', 'hashtag_list', 'category_list', 'doc_text', 'doc_html',
  'type', 'status', 'mento_group_seq', 'reg_date', 'modify_date',
  'is_complete', 'is_open_video', 'is_open_refer_file'
];

export default class OperationFolderInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(default_key_list);

    if (data) {
      if (data.hashtag_list && typeof data.hashtag_list === 'string') {
        this.hashtag_list = JSON.parse(data.hashtag_list)
      }
      if (data.category_list && typeof data.category_list === 'string') {
        this.category_list = JSON.parse(data.category_list)
      }
      if (data.hashtag && typeof data.hashtag === 'string') {
        this.hashtag_list = Util.parseHashtag(data.hashtag)
      }
      this.is_complete = Util.isTrue(data.is_complete)
      this.is_open_refer_file = Util.isTrue(data.is_open_refer_file)
      this.is_open_video = Util.isTrue(data.is_open_video)
    }
  }

  setUrl = () => {
    if (this.thumbnail) {
      this.thumbnail = ServiceConfig.get('static_storage_prefix') + this.thumbnail;
    }
  }
}
