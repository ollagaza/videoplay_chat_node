import _ from 'lodash';
import ServiceConfig from '../service-config';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import FollowerModel from "../../database/mysql/Follow/FollowerModel";
import FollowingModel from "../../database/mysql/Follow/FollowingModel";

const FollowServiceClass = class {
  constructor () {
    this.log_prefix = '[FollowServiceClass]'
  }

  getFollowerModel = (database = null) => {
    if (database) {
      return new FollowerModel(database)
    }
    return new FollowerModel(DBMySQL)
  }

  getFollowingModel = (database = null) => {
    if (database) {
      return new FollowingModel(database)
    }
    return new FollowingModel(DBMySQL)
  }

  getFollowerLists = async (database, group_seq) => {
    try {
      const followerModel = this.getFollowerModel(database);
      const result = await followerModel.getFollowerLists(group_seq);
      await this.setProfileImage(result);
      return result;
    } catch (e) {
      throw e;
    }
  }

  getFollowingLists = async (database, group_seq) => {
    try {
      const followingModel = this.getFollowingModel(database);
      const result = await followingModel.getFollowingLists(group_seq);
      await this.setProfileImage(result);
      return result;
    } catch (e) {
      throw e;
    }
  }

  setProfileImage = async (result) => {
    if (result.length != 0) {
      _.forEach(result, (member_info) => {
        if (!Util.isEmpty(member_info.profile_image_path)) {
          member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), member_info.profile_image_path);
        } else {
          member_info.profile_image_url = '/img/renewal/mypage/profile.png'
        }
      });
    }
  }

  RegistFollower = async (database, follow_info) => {
    try {
      const followerModel = this.getFollowerModel(database);
      const result = await followerModel.RegistFollower(follow_info);
      return result;
    } catch (e) {
      throw e;
    }
  }

  RegistFollowing = async (database, follow_info) => {
    try {
      const followingModel = this.getFollowingModel(database);
      const result = await followingModel.RegistFollowing(follow_info);
      return result;
    } catch (e) {
      throw e;
    }
  }

  UnRegistFollower = async (database, follow_info) => {
    try {
      const followerModel = this.getFollowerModel(database);
      const result = await followerModel.UnRegistFollower(follow_info);
      return result;
    } catch (e) {
      throw e;
    }
  }

  UnRegistFollowing = async (database, follow_info) => {
    try {
      const followingModel = this.getFollowingModel(database);
      const result = await followingModel.UnRegistFollowing(follow_info);
      return result;
    } catch (e) {
      throw e;
    }
  }
}

const FollowService = new FollowServiceClass()

export default FollowService
