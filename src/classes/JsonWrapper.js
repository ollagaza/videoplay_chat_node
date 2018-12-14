export default class JsonWrapper {
  constructor(data, private_keys=[]) {
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
  }

  isEmpty = () => {
    return this.is_empty;
  }

  toJSON = () => {
    const result = {};

    for (let index in this.json_keys) {
      const key = this.json_keys[index];
      result[key] = this[key];
    }

    return result;
  }

  toString = () => {
    return JSON.stringify(this.toJson());
  }
}
