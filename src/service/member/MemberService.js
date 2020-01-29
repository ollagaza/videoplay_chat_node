import ServiceConfig from '../../service/service-config';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberLogService from './MemberLogService'
import MemberModel from '../../database/mysql/member/MemberModel';
import MemberSubModel from '../../database/mysql/member/MemberSubModel';
import MemberLogModel from '../../database/mysql/member/MemberLogModel';
import FindPasswordModel from '../../database/mysql/member/FindPasswordModel';
import { UserDataModel } from '../../database/mongodb/UserData';
import MemberInfo from "../../wrapper/member/MemberInfo";
import MemberInfoSub from "../../wrapper/member/MemberInfoSub";
import MemberTemplate from '../../template/mail/member.template';
import SendMail from '../../libs/send-mail'

const MemberServiceClass = class {
  constructor () {
    this.log_prefix = '[MemberServiceClass]'
    this.member_private_fields = ['password',
      'license_no', 'license_image_path', 'special_no',
      'major', 'major_text', 'major_sub', 'major_sub_text', 'worktype',
      'trainingcode', 'trainingname', 'universitycode', 'universityname',
      'graduation_year', 'interrest_code', 'interrest_text'];

    this.member_sub_private_fields = ['regist_date', 'modify_date', 'user_id', 'password',
      'user_nickname', 'user_name', 'gender', 'email_address',
      'mail_acceptance', 'birth_day', 'cellphone', 'tel',
      'user_media_path', 'profile_image_path', 'certkey', 'used',
      'hospcode', 'hospname', 'treatcode', 'treatname',
      'etc1', 'etc2', 'etc3', 'etc4', 'etc5'
    ];
  }

  checkMyToken = (token_info, member_seq) => {
    if (token_info.getId() !== member_seq){
      if(token_info.getRole() !== Role.ADMIN){
        return false
      }
    }
    return true
  }

  getMemberModel = (database = null) => {
    if (database) {
      return new MemberModel(database)
    }
    return new MemberModel(DBMySQL)
  }

  getMemberSubModel = (database = null) => {
    if (database) {
      return new MemberSubModel(database)
    }
    return new MemberSubModel(DBMySQL)
  }

  getMemberInfo = async (database, member_seq) => {
    const { member_info } = await this.getMemberInfoWidthModel(database, member_seq)
    return member_info
  }

  getMemberInfoWidthModel = async (database, member_seq) => {
    const member_model = this.getMemberModel(database)
    const member_info = await member_model.getMemberInfo(member_seq)
    if (member_info.isEmpty() || !member_info.seq) {
      throw new StdObject(-1, '회원정보가 존재하지 않습니다.', 400)
    }
    if (!member_info.isEmpty() && !Util.isEmpty(member_info.profile_image_path)) {
      member_info.addKey('profile_image_url');
      member_info.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), member_info.profile_image_path);
    }

    return {
      member_model,
      member_info
    }
  }

  getMemberInfoById = async (database, user_id) => {
    const member_model = this.getMemberModel(database)
    return await member_model.getMemberInfoById(user_id)
  }

  getMemberSubInfo = async (database, member_seq, lang = 'kor') => {
    const member_sub_model = this.getMemberSubModel(database)
    return await member_sub_model.getMemberSubInfo(member_seq, lang)
  }

  getMemberInfoWithSub = async (database, member_seq, lang = 'kor') => {
    const member_info = await this.getMemberInfo(database, member_seq)
    const member_sub_info = await this.getMemberSubInfo(database, member_seq, lang)

    return {
      member_info,
      member_sub_info
    }
  }

  getMemberInfoByToken = async (database, token_info) => {
    return await this.getMemberInfo(database, token_info.getId())
  }

  createMember = async (database, member_info) => {
    const member_model = this.getMemberModel(database)
    const member_seq = await member_model.createMember(member_info)
    if (member_seq <= 0){
      throw new StdObject(-1, '회원정보 생성 실패', 500);
    }
    await MemberLogService.memberJoinLog(database, member_seq)
  }

  modifyMemberInfo = async (database, member_seq, member_info, add_log = true) => {
    const member_model = this.getMemberModel(database)
    const modify_result = await member_model.modifyMember(member_seq, member_info)

    if (add_log) {
      await MemberLogService.memberModifyLog(database, member_seq)
    }

    return modify_result
  }

  modifyMemberSubInfo = async (database, member_seq, member_sub_info) => {
    const member_sub_model = this.getMemberSubModel(database)
    return await member_sub_model.modifyMember(member_seq, member_sub_info)
  }

  modifyMemberWithSub = async (database, member_seq, member_info, member_sub_info) => {
    const update_member_result = await this.modifyMemberInfo(database, member_seq, member_info, false)
    const update_member_sub_result = await this.modifyMemberSubInfo(database, member_seq, member_sub_info)

    await MemberLogService.memberModifyLog(database, member_seq)

    return update_member_result & update_member_sub_result
  }

  checkPassword = async (database, member_info, password, db_update = true) => {
    const member_model = this.getMemberModel(database)
    if (member_info.password !== member_model.encryptPassword(password)) {
      throw new StdObject(-1, "회원정보가 일치하지 않습니다.", 400);
    }
    if (db_update) {
      await member_model.updateLastLogin(member_info.seq);
    }
  }

  changePassword = async (database, member_seq, request_body) => {
    if (Util.trim(request_body.old_password) === '') {
      throw new StdObject(-1, "잘못된 요청입니다.", 400);
    }

    if (request_body.password !== request_body.password_confirm) {
      throw new StdObject(-1, '입력한 비밀번호가 일치하지 않습니다.', 400);
    }

    const { member_info, member_model } = await this.getMemberInfoWidthModel(database, member_seq)
    await this.checkPassword(database, member_info, request_body.old_password, false)
    await member_model.changePassword(member_seq, request_body.password)
    return true
  }

  findMemberId = async (database, request_body) => {
    const member_info = new MemberInfo(request_body);
    member_info.setKeys(['user_name', 'email_address']);
    member_info.checkUserName();
    member_info.checkEmailAddress();

    const output = new StdObject();

    const member_model = this.getMemberModel(database)
    const find_member_info = await member_model.findMemberId(member_info);
    if (find_member_info && find_member_info.seq) {
      output.add('user_id', find_member_info.user_id);
      output.add('user_name', find_member_info.user_name);
      output.add('email_address', find_member_info.email_address);
      output.add('is_find', true);
    } else {
      output.add('is_find', false);
    }

    return output
  }

  sendAuthCode = async (database, request_body) => {
    const member_info = new MemberInfo(request_body);
    member_info.setKeys(['user_name', 'email_address', 'user_id']);
    member_info.checkUserId();
    member_info.checkUserName();
    member_info.checkEmailAddress();

    const output = new StdObject();

    const member_model = this.getMemberModel(database)
    const find_member_info = await member_model.findMemberId(member_info);

    if (find_member_info && find_member_info.seq) {
      const remain_time = 600;
      const expire_time = Math.floor(Date.now() / 1000) + remain_time

      const auth_info = await new FindPasswordModel(database).createAuthInfo(find_member_info.seq, find_member_info.email_address, expire_time);
      output.add('seq', auth_info.seq);
      output.add('check_code', auth_info.check_code);
      output.add('remain_time', remain_time);

      const template_data = {
        "user_name": find_member_info.user_name,
        "user_id": find_member_info.user_id,
        "email_address": find_member_info.email_address,
        "send_code": auth_info.send_code,
        "url_prefix": request_body.url_prefix,
        "request_domain": request_body.request_domain
      };

      const send_mail_result = await new SendMail().sendMailHtml([find_member_info.email_address], 'Surgstory 비밀번호 인증코드 입니다.', MemberTemplate.findUserInfo(template_data));
      if (send_mail_result.isSuccess() === false) {
        throw send_mail_result;
      }

      output.add('is_send', true);
    } else {
      output.add('is_send', false);
    }

    return output
  }

  checkAuthCode = async (database, request_body) => {
    const find_password_model = new FindPasswordModel(database);
    const auth_info = await find_password_model.findAuthInfo(request_body.seq);
    if (!auth_info) {
      throw new StdObject(-1, '인증정보를 찾을 수 없습니다.', 400);
    }
    if (auth_info.send_code === request_body.send_code && auth_info.check_code === request_body.check_code) {
      await find_password_model.setVerify(request_body.seq);
    } else {
      throw new StdObject(-1, '인증코드가 일치하지 않습니다.', 400);
    }
    const output = new StdObject();
    output.add('is_verify', true);
    return output
  }

  resetPassword = async (database, request_body) => {
    if (request_body.password !== request_body.password_confirm) {
      throw new StdObject(-1, '입력한 비밀번호가 일치하지 않습니다.', 400);
    }
    const find_password_model = new FindPasswordModel(database);
    const auth_info = await find_password_model.findAuthInfo(request_body.seq);
    if (!auth_info) {
      throw new StdObject(-1, '인증정보를 찾을 수 없습니다.', 400);
    }
    if (auth_info.is_verify === 1) {
      const member_model = this.getMemberModel(database);
      await member_model.changePassword(auth_info.member_seq, request_body.password);
    } else {
      throw new StdObject(-2, '인증정보가 존재하지 않습니다.', 400);
    }
    const output = new StdObject();
    output.add('is_change', true);
    return output
  }

  changeProfileImage = async (database, member_seq, request, response) => {
    const { member_info, member_model } = await this.getMemberInfoWidthModel(database, member_seq);

    const output = new StdObject(-1, '프로필 업로드 실패');

    const media_root = ServiceConfig.get('media_root');
    const upload_path = member_info.user_media_path + `_upload_${Constants.SEP}profile`;
    const upload_full_path = media_root + upload_path;
    if (!(await Util.fileExists(upload_full_path))) {
      await Util.createDirectory(upload_full_path);
    }

    await Util.uploadByRequest(request, response, 'profile', upload_full_path, Util.getRandomId());

    const upload_file_info = request.file;
    if (Util.isEmpty(upload_file_info)) {
      throw new StdObject(-1, '파일 업로드가 실패하였습니다.', 500);
    }

    const origin_image_path = upload_file_info.path;
    const resize_image_path = upload_path + Constants.SEP + Util.getRandomId() + '.png';
    const resize_image_full_path = media_root + resize_image_path;
    const resize_result = await Util.getThumbnail(origin_image_path, resize_image_full_path, 0, 300, 400);

    await Util.deleteFile(origin_image_path);

    if (resize_result.success) {
      const update_profile_result = await member_model.updateProfileImage(member_seq, resize_image_path);
      if (update_profile_result) {
        if (!Util.isEmpty(member_info.profile_image_path)) {
          await Util.deleteFile(media_root + member_info.profile_image_path);
        }
        output.error = 0;
        output.message = '';
        output.add('profile_image_url', Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), resize_image_path));
      } else {
        await Util.deleteFile(resize_image_full_path);
        output.error = -2;
      }
    } else {
      output.error = -3;
    }

    return output
  }

  isDuplicateId = async (database, user_id) => {
    const member_model = this.getMemberModel(database)
    return await member_model.isDuplicateId(user_id);
  }

  isDuplicateNickname = async (database, user_id) => {
    const member_model = this.getMemberModel(database)
    return await member_model.isDuplicateNickname(user_id);
  }

  getMemberMetadata = async (member_seq) => {
    let user_data = await UserDataModel.findByMemberSeq(member_seq, '-_id -member_seq -created_date -modify_date');
    if (!user_data) {
      user_data = await UserDataModel.createUserData(member_seq, {});
    }
    return user_data
  }

  leaveMember = async (database, member_seq, leave_text) => {
    const member_model = this.getMemberModel(database)
    await member_model.leaveMember(member_seq)
    await MemberLogService.memberLeaveLog(database, member_seq, leave_text)
  }

  findMembers = async (database, search_text) => {
    const member_model = this.getMemberModel(database)
    const find_users = await member_model.findMembers(search_text);
    return find_users
  }
}

const member_service = new MemberServiceClass()

export default member_service
