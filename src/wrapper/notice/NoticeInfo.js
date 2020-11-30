import JsonWrapper from '../json-wrapper'
import Util from '../../utils/baseutil'

export default class NoticeInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)

    this.setKeys([
      'seq', 'subject', 'contents', 'view_count', 'is_pin',
      'is_limit', 'start_date', 'end_date', 'code',
      'reg_date', 'end_date', 'user_name', 'user_nickname'
    ])

    if (data) {
      if (Util.isBoolean(data.is_pin)) {
        this.is_pin = data.is_pin ? 1 : 0
      } else if (!Util.isNumber(data.is_pin)) {
        this.is_pin = Util.parseInt(data.is_pin, 0) > 0
      }

      if (Util.isBoolean(data.is_limit)) {
        this.is_limit = data.is_limit ? 1 : 0
      } else if (!Util.isNumber(data.is_limit)) {
        this.is_limit = Util.parseInt(data.is_limit, 0) > 0
      }
    }
  }
}
