const NONE = -1;
const ALL = 0;
const MEMBER = 5;
const MANAGER = 8;
const UN_LIMIT = 50;
const ADMIN = 99;

export default {
  "NONE": NONE,
  "ALL": ALL,
  "MEMBER": MEMBER,
  "MANAGER": MANAGER,
  "UN_LIMIT": UN_LIMIT,
  "ADMIN": ADMIN,
  "LOGIN_USER": [MEMBER, MANAGER, ADMIN],
  "DEFAULT": [MEMBER, ADMIN],
};
