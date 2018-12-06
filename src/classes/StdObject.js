export default class StdObject {
  constructor(error, message, httpStatusCode) {
    this.error = 0; ///< 에러 코드 (0이면 에러 아님)
    this.message = 'success'; ///< 에러 메세지 (success이면 에러 아님)
    this.variables = {}; ///< 추가 변수
    this.httpStatusCode = 200;

    error = typeof error !== 'undefined' ? error : 0;
    message = typeof message !== 'undefined' ? message : 'success';
    httpStatusCode = typeof httpStatusCode !== 'undefined' ? httpStatusCode : 200;
    this.init(error, message, httpStatusCode);
  }

  init(error, message, httpStatusCode) {
    error = typeof error !== 'undefined' ? error : 0;
    message = typeof message !== 'undefined' ? message : 'success';
    httpStatusCode = typeof httpStatusCode !== 'undefined' ? httpStatusCode : 200;

    this.setError(error);
    this.setMessage(message);
    this.setHttpStatusCode(httpStatusCode);
  }

  setError(error) {
    if(typeof error === "undefined"){
      error =   0;
    }

    this.error = error;
  }

  getError() {
    return this.error;
  }

  setHttpStatusCode(code) {
    if(typeof code === "undefined") {
      code = 200;
    }

    this.httpStatusCode = code;
  }

  getHttpStatusCode() {
    return this.httpStatusCode;
  }

  setMessage(message, type) {
    if(typeof message === "undefined"){
      message = 'success';
    }

    if(typeof type === "undefined"){
      type = null;
    }

    this.message = message;

    // TODO This method always returns True. We'd better remove it
    return true;
  }

  getMessage () {
    return this.message;
  }

  add(key, val) {
    this.variables[key] = val;
  }

  adds (object) {
    for (const key in object) {
      let val = object[key];
      this.variables[key] = val;
    }
  }

  get(key) {
    return this.variables[key];
  }

  gets(...args) {

    const output = {};
    for (let argKey in args) {      
      let arg = args[argKey];
      output[arg] = this.get(arg);
    }
    return output;
  }

  getVariables() {
    return this.variables;
  }

  getObjectVars() {
    const output = {};
    for (const key in this.variables) {
      let val = this.variables[key];
      output[key] = val;
    }
    return output;
  }

  toBool() {
    // TODO This method is misleading in that it returns true if error is 0, which should be true in boolean representation.
    return (this.error === 0);
  }

  toBoolean() {
    return this.toBool();
  }
}