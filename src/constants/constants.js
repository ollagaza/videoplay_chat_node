import path from 'path'
import config from '../config/config'

const SEP = path.sep

const NONE = 'none'
const NO_MEDIA = 100

const TEXT = 'text'
const IMAGE = 'image'
const VIDEO = 'video'
const AUDIO = 'audio'
const INTRO = 'intro'
const INSERT = 'insert'
const RESIZE_FILL = 'fill'
const RESIZE_CONTAIN = 'contain'
const RESIZE_COVER = 'cover'
const CENTER = 'center'
const LEFT = 'left'
const RIGHT = 'right'
const TOP = 'top'
const BOTTOM = 'bottom'
const AUTO = 'auto'
const MAX = 'max'
const NEW = 'new'
const ASC = 'asc'
const DESC = 'desc'
const PROCESS = 'process'
const CREATE = 'create'
const MODIFY = 'modify'
const PREVIEW = 'preview'
const TIMESTAMP = 'timestamp'

let TOKEN_SECRET = 'dpxldlwlTjwlqnr'
if (config.isRelease()) {
  TOKEN_SECRET = 'dpaxldlwl.surgstory.com'
}

const GB = 1024 * 1024 * 1024
const MAX_ARCHIVE_FILE_SIZE = GB

const ARCHIVE = 'archive'
const OBJECT = 'object'
const LOCAL = 'local'

export default {
  'NONE': NONE,
  'NO_MEDIA': NO_MEDIA,
  'TEXT': TEXT,
  'IMAGE': IMAGE,
  'VIDEO': VIDEO,
  'AUDIO': AUDIO,
  'INTRO': INTRO,
  'INSERT': INSERT,
  'RESIZE_FILL': RESIZE_FILL,
  'RESIZE_CONTAIN': RESIZE_CONTAIN,
  'RESIZE_COVER': RESIZE_COVER,
  'CENTER': CENTER,
  'LEFT': LEFT,
  'RIGHT': RIGHT,
  'TOP': TOP,
  'BOTTOM': BOTTOM,
  'AUTO': AUTO,
  'MAX': MAX,
  'NEW': NEW,
  'ASC': ASC,
  'DESC': DESC,
  'PROCESS': PROCESS,
  'CREATE': CREATE,
  'MODIFY': MODIFY,
  'PREVIEW': PREVIEW,
  'SEP': SEP,
  'TOKEN_SECRET': TOKEN_SECRET,
  'GB': GB,
  'TIMESTAMP': TIMESTAMP,
  'ARCHIVE': ARCHIVE,
  'OBJECT': OBJECT,
  'LOCAL': LOCAL,
  'MAX_ARCHIVE_FILE_SIZE': MAX_ARCHIVE_FILE_SIZE
}
