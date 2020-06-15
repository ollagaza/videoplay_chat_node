import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'

const default_key_list = [
  'seq', 'operation_seq', 'group_seq', 'group_name', 'hospital', 'title', 'view_count', 'total_time',
  'thumbnail', 'hashtag_list', 'category_list', 'doc_text', 'doc_html', 'status',
  'is_complete', 'is_community', 'is_mentoring', 'mento_group_seq', 'reg_date', 'modify_date'
];

export default class OperationFolderInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys(default_key_list);

    if (data.hashtag_list && typeof data.hashtag_list === 'string') {
      this.hashtag_list = JSON.parse(data.hashtag_list)
    }
    if (data.category_list && typeof data.category_list === 'string') {
      this.category_list = JSON.parse(data.category_list)
    }
    if (data.is_complete != null) {
      this.is_complete = Util.parseInt(data.is_complete, 0) > 0;
    }
    if (data.is_community != null) {
      this.is_community = Util.parseInt(data.is_community, 0) > 0;
    }
    if (data.is_mentoring != null) {
      this.is_mentoring = Util.parseInt(data.is_mentoring, 0) > 0;
    }
  }
}
