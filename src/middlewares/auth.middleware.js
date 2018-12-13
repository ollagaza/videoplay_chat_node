import jwt from 'jsonwebtoken';
import StdObject from '@/classes/StdObject';
import TokenInfo from '@/classes/TokenInfo';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import roles from "@/config/roles";

const TOKEN_SECRET = "dpxldlwlTjwlqnr";
const IS_DEV = process.env.NODE_ENV === 'development';
const HOUR = 60 * 60;

const setAuthHeader = (res, token) => {
  res.setHeader('Authorization', 'Bearer ' + token);
};

const getToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.access_token) {
    return req.query.access_token;
  }
  return null;
};

const generateToken = async (id) => {
  const member_model = new MemberModel({database});
  const member_info = await member_model.findOne({seq: id});

  return generateTokenByMemberInfo(member_info);
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
    "token": token
  };
};

const isAuthenticated = (require_roles) => {
  return function (req, res, next) {
    if (require_roles == null || require_roles == roles.ALL) {
      return next();
    }

    const token = getToken(req);

    if (!token) {
      return res.status(401).send(new StdObject(-1, '로그인 후 이용 가능합니다.', 401));
    }

    req.headers.authorization = 'Bearer ' + token;

    jwt.verify(token, TOKEN_SECRET, async (error, decoded) => {
      const output = new StdObject(-1, '로그인 후 이용 가능합니다.', 403);

      if (error) {
        if (IS_DEV) {
          output.stack = error.stack;
          output.setMessage(error.message);
        }
        return res.status(output.getHttpStatusCode()).json(output);
      } else {
        const expire = new Date(decoded.exp * 1000);
        const now = Date.now();

        const token_info = decoded.info;
        const role = token_info.role;
        const id = token_info.id;

        if (expire < now) {
          if (IS_DEV) {
            output.stack = {"tokenExp": expire, "now": now};
            output.setMessage('토큰 유효기간 만료');
          }
          return res.status(output.getHttpStatusCode()).json(output);
        }

        let has_role = true;
        if (require_roles != null) {
          if (Array.isArray(require_roles)) {
            has_role = require_roles.find(role => role === role);
          } else {
            has_role = role >= require_roles;
          }
        }

        if (!has_role) {
          output.setMessage('사용 권한이 없습니다.');
          if (IS_DEV) {
            output.stack = {"userRole": role, "roles": require_roles};
          }
          return res.status(output.getHttpStatusCode()).json(output);
        }

        if (expire < now + HOUR) {
          const refresh_token_info = await generateToken(id);
          setAuthHeader(res, refresh_token_info.token);

          req.token_info = refresh_token_info.token_info;
        }
        else {
          req.token_info = new TokenInfo(token_info);
        }

        next();
      }
    });
  }
}

export default {
  "setAuthHeader": setAuthHeader,
  "generateTokenByMemberInfo": generateTokenByMemberInfo,
  "isAuthenticated": isAuthenticated
};
