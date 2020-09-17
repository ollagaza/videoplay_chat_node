import _ from 'lodash'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/baseutil'
import ServiceConfig from '../service-config'

const EditorServiceClass = class {
  constructor () {
    this.log_prefix = '[EditorService]'
  }

  deleteContentDirectory = async (contentid) => {
    try {
      const editor_root = ServiceConfig.get('editor_root') + `${contentid}`
      const result = await Util.deleteDirectory(editor_root)
      return result
    } catch (e) {
      throw e
    }
  }

  checkImageFiles = async (contentid, arrImages) => {
    try {
      const editor_root = ServiceConfig.get('editor_root') + `${contentid}`
      const directoryFileList = await Util.getDirectoryFileList(editor_root, false)
      const diff = _.difference(directoryFileList, arrImages)

      if (diff.length !== 0) {
        _.forEach(diff, async (value) => {
          await Util.deleteFile(`${editor_root}/${value}`)
        })
      }
    } catch (e) {
      throw e
    }
  }

  uploadEditorImage = async (contentid, media_path, request, response) => {
    try {
      const editor_root = ServiceConfig.get('media_root') + media_path + '/editor'
      if (!(await Util.fileExists(editor_root))) {
        await Util.createDirectory(editor_root)
      }
      const new_file_name = Util.getRandomId()
      await Util.uploadByRequest(request, response, 'editor', editor_root, new_file_name)
      const upload_file_info = request.file
      if (Util.isEmpty(upload_file_info)) {
        throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500)
      }

      return upload_file_info
    } catch (e) {
      throw new StdObject(-1, e, 400)
    }
  }
}

const EditorService = new EditorServiceClass()

export default EditorService
