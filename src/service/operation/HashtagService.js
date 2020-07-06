import Util from '../../utils/baseutil'
import DBMySQL from '../../database/knex-mysql'

import HashtagModel from '../../database/mysql/operation/HashtagModel'
import HashtagUseModel from '../../database/mysql/operation/HashtagUseModel'

const HashtagServiceClass = class {
  constructor () {
    this.log_prefix = '[HashtagService]'
  }

  getHashtagModel = (database = null) => {
    if (database) {
      return new HashtagModel(database)
    }
    return new HashtagModel(DBMySQL)
  }

  getHashtagUseModel = (database = null) => {
    if (database) {
      return new HashtagUseModel(database)
    }
    return new HashtagUseModel(DBMySQL)
  }

  updateOperationHashtag = async (group_seq, hashtag, operation_data_seq) => {
    if (!hashtag || !Util.trim(hashtag)) {
      return false
    }
    const hashtag_list = Util.parseHashtag(hashtag)

    const hashtag_model = this.getHashtagModel(DBMySQL)
    const tag_seq_list = await hashtag_model.createHashtagList(hashtag_list)

    await DBMySQL.transaction(async(transaction) => {
      const hashtag_use_model = this.getHashtagUseModel(transaction)
      await hashtag_use_model.deleteUnUseTagList(tag_seq_list, operation_data_seq, hashtag_use_model.TYPE_OPERATION_DATA)
      await hashtag_use_model.updateHashtagUseList(1, tag_seq_list, operation_data_seq, hashtag_use_model.TYPE_OPERATION_DATA)
    })

    const hashtag_use_model = this.getHashtagUseModel(DBMySQL)
    try {
      await hashtag_use_model.updateHashtagCount(tag_seq_list)
    } catch (error) {
      log.error(this.log_prefix, '[updateOperationHashtag]', error)
    }
  }
}

const hashtag_service = new HashtagServiceClass()
export default hashtag_service
