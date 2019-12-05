import jwt from 'jsonwebtoken';
import StdObject from '@/classes/StdObject';
import TokenInfo from '@/classes/TokenInfo';
import roles from "@/config/roles";
import config from "@/config/config";

const IS_DEV = config.isDev();

const TOKEN_SECRET = "dpxldlwlTjwlqnr";
const HOUR = 60 * 60;

const setResponseHeader = (res, token_info) => {
  if (!res || !token_info) {
    return;
  }
  res.setHeader('authorization', 'Bearer ' + token_info.getToken());
  res.setHeader('auth-remain', '' + token_info.getRemainTime());
  res.setHeader('auth-role', '' + token_info.getRole());
};

const getToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.access_token) {
    return req.query.access_token;
  }
  return null;
};

const generateTokenByMemberInfo = (member_info, un_limit = false) => {
  const expire = un_limit ? Number.MAX_VALUE : 24 * HOUR;
  const token_info = new TokenInfo();
  token_info.setTokenByMemberInfo(member_info);

  const token = jwt.sign({"info": token_info}, TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: expire
  });

  token_info.token = token;

  return {
    "token_info": token_info,
    "token": token,
    "remain": expire
  };
};

const isAuthenticated = (require_roles) => {
  return async (req, res, next) => {
    const token = getToken(req);

    if (!token && (require_roles == null || require_roles === roles.ALL)) {
      return next();
    }

    const verify_result = await verifyToken(req, require_roles);
    if (verify_result.isSuccess()) {
      req.token_info = verify_result.get('token_info');
      setResponseHeader(res, req.token_info);
      next();
    } else {
      return res.status(verify_result.httpStatusCode).send(verify_result);
    }
  }
};

const verifyToken = async (req, require_roles=null) => {
  const token = getToken(req);

  if (!token) {
    return new StdObject(-1, '로그인 후 이용 가능합니다.', 401);
  }

  const output = new StdObject(-1, '', 403);
  try {
    const verify_result = await jwt.verify(token, TOKEN_SECRET);
    const expire = verify_result.exp * 1000;
    const now = Date.now();
    const remain_time = Math.floor((expire - now) / 1000);

    const token_info = verify_result.info;
    const role = token_info.role;

    if (remain_time <= 0) {
      if (IS_DEV) {
        output.stack = {"tokenExp": expire, "now": now};
        output.setMessage('토큰 유효기간 만료');
      }
      return output;
    }

    if (remain_time <= 0) {
      if (IS_DEV) {
        output.stack = {"tokenExp": expire, "now": now};
        output.setMessage('토큰 유효기간 만료');
      }
      return output;
    }

    let has_role = true;
    if (require_roles != null) {
      if (Array.isArray(require_roles)) {
        has_role = require_roles.find(require_role => require_role === role);
      } else {
        has_role = role >= require_roles;
      }

      if (!has_role) {
        output.setMessage('사용 권한이 없습니다.');
        if (IS_DEV) {
          output.stack = {"userRole": role, "roles": require_roles};
        }
        return output;
      }
    }

    output.error = 0;
    output.httpStatusCode = 200;
    output.add("token_info", new TokenInfo(token_info, token, remain_time));
  }
  catch (error) {
    output.error = -1;
    output.httpStatusCode = 403;
    if (IS_DEV) {
      output.stack = error;
      output.setMessage(error.message);
    }
  }

  return output;
};

const getTokenResult = async (res, member_info, role) => {
  member_info.role = role;

  const token_result = await generateTokenByMemberInfo(member_info);

  const output = new StdObject();
  if (token_result != null && token_result.token != null) {
    output.add("token", token_result.token);
    output.add("remain_time", token_result.remain);
    output.add("member_seq", member_info.seq);
    output.add("role", token_result.token_info.getRole());
    setResponseHeader(res, token_result.token_info);
  }
  else {
    output.setError(-1);
    output.setMessage("인증토큰 생성 실패");
    output.httpStatusCode = 500;
  }

  return output;
};

const getLanguage = (req) => {
  let lang = req.headers.lang;

  if (lang === undefined || lang === '') {
    lang = 'kor';
  }

  return lang;
};

export default {
  "setResponseHeader": setResponseHeader,
  "generateTokenByMemberInfo": generateTokenByMemberInfo,
  "isAuthenticated": isAuthenticated,
  "verifyToken": verifyToken,
  "getTokenResult": getTokenResult,
  "getLanguage": getLanguage
};
