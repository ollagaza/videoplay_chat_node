import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";
import MemberInfo from "../../../wrapper/member/MemberInfo";

export default class MemberModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'member'
    this.selectable_fields = ['*']
    this.log_prefix = '[AdminMemberModel]'
  }

  findMembers = async (filter) => {
    const find_user_results = await this.find(filter);
    if (!find_user_results || find_user_results.length === 0) {
      return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return find_user_results;
  };

  findMembersforPagenation = async (searchText) => {
    const find_user_results = await this.findPaginated(searchText, null, null, null, searchText.page_navigation);
    if (!find_user_results.data || find_user_results.data.length === 0) {
      return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return find_user_results;
  };

  findMembersforNonPagenation = async (searchText) => {
    try {
    const find_user_results = await this.find(searchText);
    if (!find_user_results || find_user_results.length === 0) {
      return new StdObject(-1, '등록된 회원 정보가 없습니다.', 400);
    }
    return find_user_results;
    } catch(exception) {
      log.debug(this.log_prefix, 'exception', exception);
    }
  };

  updateAdminUserData = async (setData, search_option = null) => {
    return await this.update(search_option, setData);
  };
}
