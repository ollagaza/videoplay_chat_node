const NONE = -1;
const ALL = 0;
const API = 1;
const MEMBER = 5;
const MANAGER = 8;
const ADMIN = 99;

export default {
  "NONE": NONE,
  "ALL": ALL,
  "API": API,
  "MEMBER": MEMBER,
  "MANAGER": MANAGER,
  "ADMIN": ADMIN,
  "LOGIN_USER": [MEMBER, MANAGER, ADMIN],
  "DEFAULT": [MEMBER, ADMIN],
};
