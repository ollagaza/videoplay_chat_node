import MySQLModel from '../../mysql-model'

export default class SendMailModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'sendmail'
    this.selectable_fields = ['*']
    this.log_prefix = '[SendMailModel]'
  }

  createSendMail = async (sendmail_data) => {
    return await this.create(sendmail_data, 'seq')
  }

  fileUpdateSendMail = async (seq, params) => {
    return await this.update({ seq }, params)
  }

  getSendMailList = async (group_seq) => {
    return await this.find({ group_seq })
  }

  getSendMailFindOne = async (group_seq, seq) => {
    return await this.findOne({ seq, group_seq })
  }

  getReservationEmailList = async () => {
    return await this.find({ })
  }
}
