import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'
import OperationInfo from "./OperationInfo";
import log from "../../libs/logger";
import ServiceConfig from "../../service/service-config";

const default_key_list = [
  'seq', 'list_no', 'operation_type', 'operation_code', 'operation_name', 'operation_date', 'folder_seq', 'group_seq', 'member_seq', 'user_name',
  , 'patient_age', 'patient_sex', 'hour', 'minute', 'status', 'analysis_status', 'is_favorite'
  , 'reg_date', 'reg_diff_hour', 'media_info', 'content_id', 'progress', 'has_link'
  , 'total_file_size', 'total_file_count', 'clip_count', 'index2_file_count', 'origin_video_count', 'trans_video_count', 'modify_date'
  , 'group_name', 'hospital', 'title', 'view_count', 'total_time', 'thumbnail', 'hashtag_list', 'category_list', 'doc_text', 'doc_html'
  , 'type', 'is_complete', 'mento_group_seq', 'is_mento_complete', 'is_open_refer_file', 'is_open_video'
]

export default class OperationInfoAndData extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys(default_key_list)

    if (data) {
      if (data._no) {
        this.list_no = data._no
      }
      if (data.is_favorite != null) {
        this.is_favorite = parseInt(data.is_favorite) > 0
      }
      if (data.created_by_user != null) {
        this.created_by_user = parseInt(data.created_by_user) > 0
      }
      if (data.is_analysis_complete != null) {
        this.is_analysis_complete = parseInt(data.is_analysis_complete) > 0
      }

      if (data.hashtag_list && typeof data.hashtag_list === 'string') {
        this.hashtag_list = JSON.parse(data.hashtag_list)
        log.debug('[OperationDataInfo]', data.hashtag_list, this.hashtag_list)
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
      this.thumbnail = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), this.thumbnail)

      if (this.reg_date) {
        this.reg_diff_hour = Util.hourDifference(this.reg_date, 'Y-m-d')
        this.reg_date = Util.dateFormat(this.reg_date.getTime())
      }
      if (this.modify_date) {
        this.modify_date = Util.dateFormat(this.modify_date.getTime())
      }
    }
  }

  setUrl = () => {
    if (this.thumbnail) {
      this.thumbnail = ServiceConfig.get('static_storage_prefix') + this.thumbnail
    }
  }

  getByRequestBody = (body) => {
    this.setKeys([
      'operation_type', 'operation_code', 'operation_name', 'operation_date', 'folder_seq'
      , 'patient_age', 'patient_sex', 'hour', 'minute', 'media_path'
    ])

    this.setIgnoreEmpty(true)

    if (body != null) {
      this.json_keys.forEach((key) => {
        if (body[key]) {
          this[key] = body[key]
        }
      })

      this.is_empty = false
    }

    return this
  }

  setMediaInfo = (media_info) => {
    this.media_info = media_info
  }
}
