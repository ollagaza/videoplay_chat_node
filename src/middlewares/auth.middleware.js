import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import role from "@/config/role";
import jwt from 'jsonwebtoken';
import MemberInfo from '@/models/MemberInfo';

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

const generateToken = (member_seq) => {
  const member_model = new MemberModel({database});
  const member_info = member_model.findOne({seq: member_seq});

  return generateTokenByMemberInfo(member_info);
};

const generateTokenByMemberInfo = (member_info) => {
  const expire = 24 * HOUR;
  const data = {
    "seq": member_info.seq,
    "role": role.MEMBER
  };
  const token = jwt.sign(data, TOKEN_SECRET, {
    algorithm: 'HS384',
    expiresIn: expire
  });

  return token;
};

const isAuthenticated = (roles) => {
  return function (req, res, next) {
    if (roles == null || roles == role.ALL) {
      return next();
    }

    const token = getToken(req);

    if (!token) {
      return res.status(401).send(new StdObject(-1, '로그인 후 이용 가능합니다.', 401));
    }

    req.headers.authorization = 'Bearer ' + token;

    jwt.verify(token, TOKEN_SECRET, (error, member_info) => {
      const output = new StdObject(-1, '로그인 후 이용 가능합니다.', 403);

      if (error) {
        if (IS_DEV) {
          output.stack = error.stack;
          output.setMessage(error.message);
        }
        return res.status(output.getHttpStatusCode()).json(output);
      } else {
        const expire = new Date(member_info.exp * 1000);
        const now = Date.now();

        const member_role = member_info.role;
        const member_seq = member_info.seq;

        if (expire < now) {
          if (IS_DEV) {
            output.stack = {"tokenExp": expire, "now": now};
            output.setMessage('토큰 유효기간 만료');
          }
          return res.status(output.getHttpStatusCode()).json(output);
        }

        let has_role = true;
        if (roles != null) {
          if (Array.isArray(roles)) {
            has_role = roles.find(role => role === member_role);
          } else {
            has_role = member_role >= roles;
          }
        }

        if (!has_role) {
          output.setMessage('사용 권한이 없습니다.');
          if (IS_DEV) {
            output.stack = {"userRole": member_role, "roles": roles};
          }
          return res.status(output.getHttpStatusCode()).json(output);
        }

        if (expire < now + (2 * HOUR)) {
          const newToken = generateToken(member_seq);
          setAuthHeader(res, newToken);
        }

        req.member_info = new MemberInfo(member_seq, member_role);

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
