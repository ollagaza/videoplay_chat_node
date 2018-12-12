export default class JsonWrapper {
  constructor(data) {
    this.json_keys = [];

    if (data === null) {
      this.is_empty = false;
      return;
    }

    this.is_empty = false;
    const key_check_regexp = /^_/;

    for (let key in data) {
      if (key_check_regexp.test(key) === false) {
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

  toJson = () => {
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
