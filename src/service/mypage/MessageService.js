import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MessageModel from "../../database/mysql/mypage/MessageModel";
import _ from "lodash";
import socketManager from "../socket-manager";

const MessageServiceClass = class {
  constructor () {
    this.log_prefix = '[MessageService]'
  }

  getMessageModel = (database = null) => {
    if (database) {
      return new MessageModel(database);
    } else {
      return new MessageModel(DBMySQL)
    }
  }

  getReceiveLists = async (database, member_seq, params, page_navigation) => {
    try {
      const output = new StdObject();
      const msgModel = this.getMessageModel(database);

      const searchObj = {
        query: {
          receive_seq: member_seq,
          is_receive_del: 0,
        },
        order: {
          name: 'regist_date',
          direction: 'asc',
        }
      };
      _.forEach(params, (value, key) => {
        searchObj.query[key] = value;
      });

      output.add('receiveList', await msgModel.getReceiveList(searchObj, page_navigation));

      return output;
    } catch (e) {
      throw e;
    }
  }

  getSendLists = async (database, member_seq, params, page_navigation) => {
    try {
      const output = new StdObject();
      const msgModel = this.getMessageModel(database);

      const searchObj = {
        query: {
          send_seq: member_seq,
          is_send_del: 0,
        },
        order: {
          name: 'regist_date',
          direction: 'asc',
        }
      };
      _.forEach(params, (value, key) => {
        searchObj.query[key] = value;
      });

      output.add('receiveList', await msgModel.getSendList(searchObj, page_navigation));

      return output;
    } catch (e) {
      throw e;
    }
  }

  setViewMessage = async (database, seq) => {
    try {
      const msgModel = this.getMessageModel(database);
      const result = await msgModel.setViewMessage(seq);

      return result;
    } catch (e) {
      throw e;
    }
  }

  sendMessage = async (database, message_info) => {
    try {
      const msgModel = this.getMessageModel(database);
      const result = await msgModel.sendMessage(message_info);
      const send_socket_message_info = {
        message_info: {
          title: '쪽지가 도착 하였습니다.',
          message: '쪽지',
          notice_type: '',
          type: 'pushNotice',
        },
        data: {
          type: null,
          action_type: null
        }
      };
      await socketManager.sendToFrontOne(message_info.receive_seq, send_socket_message_info);
      send_socket_message_info.message_info.title = '쪽지가 발송 되었습니다.';
      await socketManager.sendToFrontOne(message_info.send_seq, send_socket_message_info);
      return result;
    } catch (e) {
      throw e;
    }
  }

  deleteMessage = async (database, seq, flag) => {
    try {
      const msgModel = this.getMessageModel(database);
      const result = await msgModel.deleteMessage(seq, flag);

      return result;
    } catch (e) {
      throw e;
    }
  }
}

const MessageService = new MessageServiceClass()

export default MessageService
