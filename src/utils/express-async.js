import StdObject from '../wrapper/std-object'
import Config from '../config/config'
import ServiceErrorModel from '../database/mysql/service-error-model'
import DBMySQL from '../database/knex-mysql'

const IS_DEV = Config.isDev()

export default (fn) => {
  return (...args) => {
    const [req, res, next] = args

    return fn(...args).catch((error) => {
      let error_object = null
      // 일반적인 에러
      if (error instanceof StdObject) {
        if (!IS_DEV) {
          error.stack = null
        }
        error_object = error
      }
      // 쿼리 오류, 없는 함수 호출 등 시스템 에러
      else {
        error_object = new StdObject(-1, '전문 처리 중 장애가 발생하였습니다. 고객센터에 문의해 주세요.', 500)

        // 개발 모드일 때에만 콜스택과 에러 메세지 노출
        if (IS_DEV) {
          if (error.stack) {
            error_object.stack = error.stack
          }
          if (error.message) {
            error_object.error_message = error.message
          }
          if (error.variables && typeof error.variables === 'object') {
            error_object.variables = error.variables
          }
          if (error.httpStatusCode) {
            error_object.httpStatusCode = error.httpStatusCode
          }
        }
      }

      (async () => {
        await new ServiceErrorModel(DBMySQL).createServiceError('api', null, null, JSON.stringify(error_object.toJSON()), req)
      })()

      return next(error_object)
    })
  }
}
