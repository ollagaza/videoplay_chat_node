import StdObject from '@/classes/StdObject';
import log from "@/classes/Logger";

const IS_DEV = process.env.NODE_ENV === 'development';

export default (fn) => {
  return (...args) => {
    const [req, res, next] = args;

    return fn(...args).catch((error) => {

      log.e(req, 'Wrap.catch', error);

      // 일반적인 에러
      if(error instanceof StdObject) {
        if (!IS_DEV) {
          error.stack = null;
        }
        return next(error);
      }
      // 쿼리 오류, 없는 함수 호출 등 시스템 에러
      else {
        let output = new StdObject(-1, '전문 처리 중 장애가 발생하였습니다. 고객센터에 문의해 주세요.', 500);

        // 개발 모드일 때에만 콜스택과 에러 메세지 노출
        if (IS_DEV) {
          if (error.stack) {
            output.stack = error.stack;
          }
          if (error.message) {
            output.message = error.message;
          }
          if (error.variables && typeof error.variables === 'object') {
            output.variables = error.variables;
          }
          if (error.httpStatusCode) {
            output.httpStatusCode = error.httpStatusCode;
          }
        }
        return next(output);
      }
    })
  }
}
