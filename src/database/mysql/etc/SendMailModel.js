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
}
