import jwt from 'jsonwebtoken';
import StdObject from '@/classes/StdObject';
import TokenInfo from '@/classes/TokenInfo';
import roles from "@/config/roles";

const TOKEN_SECRET = "dpxldlwlTjwlqnr";
const IS_DEV = process.env.NODE_ENV === 'development';
const HOUR = 60 * 60;

const setAuthHeader = (res, token, remain) => {
  res.setHeader('Authorization', 'Bearer ' + token);
  res.setHeader('ExpireAfter', '' + remain);
};

const setResponseHeader = (res, token_info) => {
  if (!res || !token_info) {
    return;
  }
  res.setHeader('Authorization', 'Bearer ' + token_info.getToken());
  res.setHeader('ExpireAfter', '' + token_info.getRemainTime());
};

const getToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.access_token) {
    return req.query.access_token;
  }
  return null;
};

const generateTokenByMemberInfo = (member_info) => {
  const expire = 24 * HOUR;
  const token_info = new TokenInfo();
  token_info.setTokenByMemberInfo(member_info);

  const token = jwt.sign({"info": token_info}, TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: expire
  });

  return {
    "token_info": token_info,
    "token": token,
    "remain": expire
  };
};

const isAuthenticated = (require_roles) => {
  return async (req, res, next) => {
    if (require_roles == null || require_roles == roles.ALL) {
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
}

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
    const remain_time = Math.ceil((expire - now) / 1000);

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
        has_role = require_roles.find(role => role === role);
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
}

export default {
  "setAuthHeader": setAuthHeader,
  "generateTokenByMemberInfo": generateTokenByMemberInfo,
  "isAuthenticated": isAuthenticated,
  "verifyToken": verifyToken
};
