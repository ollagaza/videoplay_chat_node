const NONE = -1
const ALL = 0
const BOX = 1
const API = 2
const MEMBER = 5
const MANAGER = 6
const ADMIN = 99

export default {
  'NONE': NONE,
  'ALL': ALL,
  'API': API,
  'BOX': BOX,
  'MEMBER': MEMBER,
  'MANAGER': MANAGER,
  'ADMIN': ADMIN,
  'ADMINS': [MANAGER, ADMIN],
  'LOGIN_USER': [MEMBER, MANAGER, ADMIN],
  'DEFAULT': [MEMBER, MANAGER, ADMIN],
}
