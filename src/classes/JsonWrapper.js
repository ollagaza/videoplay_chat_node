import _ from 'lodash';
import StdObject from '@/classes/StdObject';
import Util from '@/utils/baseutil';

export default class JsonWrapper {
  constructor(data=null, private_keys=[]) {
    this.json_keys = [];

    if (data === null) {
      this.is_empty = false;
      return;
    }

    const private_key_map = {};
    if (private_keys) {
      for (let i = 0; i < private_keys.length; i++) {
        private_key_map[private_keys[i]] = private_keys[i];
      }
    }

    this.is_empty = false;
    const key_check_regexp = /^_/;

    for (let key in data) {
      if (private_key_map[key]) {
        this[key] = data[key];
      } else if (key_check_regexp.test(key) === false) {
        this.json_keys.push(key);
        this[key] = data[key];
      } else {
        this[key.replace(key_check_regexp, '')] = data[key];
      }
    }

    this.thorw_exception = true;
    this.ignore_empty = false;
    this.auto_trim = false;
    this.export_xml = false;
  }

  setThorwException = (value) => {
    this.thorw_exception = value;
  }

  setIgnoreEmpty = (value) => {
    this.ignore_empty = value;
  }

  setAutoTrim = (value) => {
    this.auto_trim = value;
  }

  setKeys = (keys=[]) => {
    this.json_keys = keys;
  }

  isEmpty = () => {
    return this.is_empty;
  }

  hasValue = (key) => {
    return Util.isEmpty(this[key]) === false;
  }

  setExportXml = (value) => {
    this.export_xml = value;
  }

  toJSON = () => {
    if (this.export_xml) {
      return this.getXmlJson();
    }
    return this.getObjectJson();
  }

  getObjectJson = () => {
    const result = {};

    for (let index in this.json_keys) {
      const key = this.json_keys[index];
      let value = this[key];
      if (this.ignore_empty && Util.isEmpty(value)) {
        continue;
      }
      if (this.auto_trim) {
        value = Util.trim(value);
      }
      result[key] = this[key];
    }

    return result;
  }

  getXmlJson = () => {
    return {};
  }

  toString = () => {
    return JSON.stringify(this.toJSON());
  }

  returnBoolean = (result_code=0, message='', http_status_code=200) => {
    if (result_code === 0) {
      return true;
    }
    if (this.thorw_exception) {
      throw new StdObject(result_code, message, http_status_code);
    }
    return false;
  }

  getXmlText = (element) => {
    if (!element) {
      return "";
    }
    if (element._) {
      return element._;
    }
    if (_.isArray(element)) {
      return element[0];
    }
    return element;
  }
}