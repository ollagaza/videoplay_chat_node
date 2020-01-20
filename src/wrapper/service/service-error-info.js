import JsonWrapper from '../json-wrapper'

export default class ServiceErrorInfo extends JsonWrapper {
  constructor (data = null, private_keys = []) {
    super(data, private_keys)
    this.ignore_empty = true
    this.is_checked = data ? data.is_checked === 1 : false
  }

  isCustom = () => {
    return this.is_checked
  }
}
