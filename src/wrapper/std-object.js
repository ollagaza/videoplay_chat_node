export default class StdObject {
  constructor (error, message, httpStatusCode = 200, data = null) {
    this.error = 0 ///< 에러 코드 (0이면 에러 아님)
    this.message = 'success' ///< 에러 메세지 (success이면 에러 아님)
    this.variables = {} ///< 추가 변수
    this.httpStatusCode = 200
    this.stack = null

    error = typeof error !== 'undefined' ? error : 0
    message = typeof message !== 'undefined' ? message : 'success'
    httpStatusCode = typeof httpStatusCode !== 'undefined' ? httpStatusCode : 200
    this.init(error, message, httpStatusCode, data)
  }

  init (error, message, httpStatusCode, data = null) {
    error = typeof error !== 'undefined' ? error : 0
    message = typeof message !== 'undefined' ? message : 'success'
    httpStatusCode = typeof httpStatusCode !== 'undefined' ? httpStatusCode : 200

    this.setError(error)
    this.setMessage(message)
    this.setHttpStatusCode(httpStatusCode)
    if (data) {
      this.adds(data)
    }
  }

  setError (error) {
    if (typeof error === 'undefined') {
      error = 0
    }

    this.error = error

    return this
  }

  getError () {
    return this.error
  }

  setHttpStatusCode (code) {
    if (typeof code === 'undefined') {
      code = 200
    }

    this.httpStatusCode = code

    return this
  }

  getHttpStatusCode () {
    return this.httpStatusCode
  }

  setMessage (message) {
    if (typeof message === 'undefined') {
      message = 'success'
    }

    this.message = message

    return this
  }

  getMessage () {
    return this.message
  }

  add (key, val) {
    this.variables[key] = val

    return this
  }

  adds (object) {
    if (object.toJSON) {
      object = object.toJSON()
    }

    for (const key in object) {
      let val = object[key]
      this.variables[key] = val
    }

    return this
  }

  get (key) {
    return this.variables[key]
  }

  gets (...args) {
    const output = {}
    for (let argKey in args) {
      let arg = args[argKey]
      output[arg] = this.get(arg)
    }
    return output
  }

  getVariables () {
    return this.variables
  }

  getObjectVars () {
    const output = {}
    for (const key in this.variables) {
      let val = this.variables[key]
      output[key] = val
    }
    return output
  }

  toBool () {
    return (this.error === 0)
  }

  toBoolean () {
    return this.toBool()
  }

  isSuccess () {
    return this.error === 0
  }

  toJSON = () => {
    const json = {
      'error': this.error,
      'message': this.message,
      'variables': this.variables ? (this.variables.toJSON ? this.variables.toJSON() : this.variables) : {},
      'httpStatusCode': this.httpStatusCode
    }
    if (this.stack) {
      json.stack = this.stack
    }
    return json
  }
}
