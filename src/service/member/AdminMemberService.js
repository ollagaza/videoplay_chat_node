import _ from 'lodash';
import ServiceConfig from '../service-config';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import Constants from '../../constants/constants';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberLogService from './MemberLogService'
import PaymentService from '../payment/PaymentService'
import MemberModel from '../../database/mysql/member/MemberModel';
import MemberSubModel from '../../database/mysql/member/MemberSubModel';
import AdminMemberModel from '../../database/mysql/member/AdminMemberModel';
import FindPasswordModel from '../../database/mysql/member/FindPasswordModel';
import { MedicalModel } from '../../database/mongodb/Medical';
import { InterrestModel } from '../../database/mongodb/Interrest';
import { UserDataModel } from '../../database/mongodb/UserData';
import MemberInfo from "../../wrapper/member/MemberInfo";
import MemberInfoSub from "../../wrapper/member/MemberInfoSub";
import SendMail from '../../libs/send-mail'
import Admin_MemberTemplate from '../../template/mail/admin_member_mail.template';

const AdminMemberServiceClass = class {
  constructor () {
    this.log_prefix = '[AdminMemberServiceClass]'
    this.member_private_fields = ['password',
      'license_no', 'license_image_path', 'special_no',
      'major', 'major_text', 'major_sub', 'major_sub_text', 'worktype',
      'trainingcode', 'trainingname', 'universitycode', 'universityname',
      'graduation_year', 'interrest_code', 'interrest_text',
      'member_seq'];

    this.member_sub_private_fields = ['seq', 'regist_date', 'modify_date', 'user_id', 'password',
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

  getAdminMemberModel = (database = null) => {
    if (database) {
      return new AdminMemberModel(database)
    }
    return new AdminMemberModel(DBMySQL)
  }

  getMemberInfo = async (database, member_seq) => {
    const { member_info } = await this.getMemberInfoWidthModel(database, member_seq)
    return member_info
  }

  isActiveMember = (member_info) => {
    if (!member_info || member_info.isEmpty() || !member_info.seq) {
      return false
    }
    return Util.parseInt(member_info.used, 0) === 1
  }

  getMemberStateError = (member_info) => {
    const output = new StdObject()
    if (this.isActiveMember(member_info)) {
      output.error = -1
      output.message = '등록된 회원이 아닙니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 0) {
      output.error = -2
      output.message = '회원가입 승인이 완료되지 않았습니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 2) {
      output.error = -3
      output.message = '탈퇴처리된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 3) {
      output.error = -4
      output.message = '휴면처리된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 4) {
      output.error = -5
      output.message = '사용중지된 계정입니다.'
      output.httpStatusCode = 403
    } else if (member_info.used === 5) {
      output.error = -6
      output.message = '사용제제된 계정입니다.'
      output.httpStatusCode = 403
    }
    return output
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

  adminfindMembers = async (database, params, order = null, page_navigation) => {
    const searchObj = {
      is_new: true,
      query: [],
      page_navigation: page_navigation,
    };
    _.forEach(params, (value, key) => {
      searchObj.query[key] = value;
    });

    const member_model = this.getMemberModel(database)
    const member_sub_model = this.getMemberSubModel(database)
    const find_users = await member_model.findMembers(searchObj, order);

    if (find_users.error !== -1) {
      searchObj.query = [];
      searchObj.query = [{ member_seq: _.concat('in', _.map(find_users.data, 'seq')) }]

      const find_sub_users = await member_sub_model.findMembers(searchObj);
      const res = [];
      _.keyBy(find_users.data, data => {
        if (_.find(find_sub_users, { member_seq: data.seq })) {
          const sub_user = _.find(find_sub_users, { member_seq: data.seq });
          delete sub_user.seq;
          res.push(_.merge(data, sub_user));
        } else {
          res.push(_.merge(data));
        }
      });
      find_users.data = new MemberInfo(res)
    }
    return find_users;
  }

  updateMemberUsedforSendMail = async (database, setData, search_option = null) => {
    const output = new StdObject();
    const searchObj = {
      is_new: true,
      query: [],
    };
    let appr_code = '';

    _.forEach(setData, (value, key) => {
      if (key === 'used') {
        appr_code = value;
        setData[key] = value === '5-1' ? '1' : value;
      } else if (value === null) {
        setData[key] = database.raw('null')
      } else if (value === 'now') {
        setData[key] = database.raw('NOW()');
      } else if (typeof value === 'object') {
        if (Object.keys(value)[0] === 'dateadd') {
          setData[key] = database.raw(`date_add(NOW(), interval ${value['dateadd']} day)`);
        } else if (Object.keys(value)[0] === 'datesub') {
          setData[key] = database.raw(`date_sub(NOW(), interval ${value['datesub']} day)`);
        }
      }
    });
    _.forEach(search_option, (value, key) => {
      searchObj.query[key] = value;
    });
    const adminmember_model = this.getAdminMemberModel(database)
    const update_Result = await adminmember_model.updateAdminUserData(setData, searchObj)
    if (!update_Result) {
      return new StdObject(-1, '회원정보 수정 실패', 400);
    }

    output.add('update_Result', update_Result)
    output.add('search_option', searchObj)
    output.add('appr_code', appr_code);

    return output
  }

  sendMailforMemberChangeUsed = async (database, output, appr_code, setData, ServiceDomain, search_option = null) => {
    const adminmember_model = this.getAdminMemberModel(database)
    const sned_mail_users = await adminmember_model.findMembersforNonPagenation(search_option);
    _.forEach(sned_mail_users, async (value) => {
      let send_mail_result = null;
      value.service_domain = ServiceDomain;
      value.regist_date = value.regist_date ? Util.dateFormatter(value.regist_date, 'yyyy년 mm월 dd일 HH:MM:ss') : null
      value.stop_start_date = value.stop_start_date ? Util.dateFormatter(value.stop_start_date, 'yyyy년 mm월 dd일 HH:MM:ss') : null
      value.stop_end_date = value.stop_end_date ? Util.dateFormatter(value.stop_end_date, 'yyyy년 mm월 dd일 HH:MM:ss') : null
      switch (appr_code) {
        case '1':
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리 가입승인이 완료 되었습니다.', Admin_MemberTemplate.joinconfrim_member(value));
          break;
        case '2':
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리 회원탈퇴 안내', Admin_MemberTemplate.forced_leave_member(value));
          break;
        case '3':
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리 탈퇴 되었습니다.', Admin_MemberTemplate.leave_member(value));
          break;
        case '4':
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리 장기간 사용하지 않아 휴면계정 처리 되었습니다.', Admin_MemberTemplate.dormant_member(value));
          break;
        case '5':
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리 회원활동이 정지 되었습니다.', Admin_MemberTemplate.stop_member(value));
          break;
        case '5-1':
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리 회원활동 정지가 해제 되었습니다.', Admin_MemberTemplate.stopclear_member(value));
          break;
        case '6':
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리 가입승인이 거절 되었습니다.', Admin_MemberTemplate.reject_member(value));
          break;
        default:
          send_mail_result = await new SendMail().sendMailHtml(value.email_address, '서지스토리테스트 메일', Admin_MemberTemplate.test_mail(value));
          break;
      }
      if (send_mail_result.isSuccess() === false) {
        return send_mail_result;
      }
    });

    output.add('is_send', true)

    return output;
  }

  getMongoData = async(getDataParam, getLangParam = 'kor') => {
    let output = new StdObject();
    let result_data = null;

    switch (getDataParam) {
      case 'medical':
        result_data = await MedicalModel.findAll()
        output.add('medical', _.sortBy(result_data[0]._doc[getLangParam], 'text'));
        break;
      case 'interrest':
        result_data = await InterrestModel.findAll()
        output.add('interrest', _.sortBy(result_data[0]._doc[getLangParam], 'text'));
        break;
      default:
        result_data = await MedicalModel.findAll()
        output.add('medical', _.sortBy(result_data[0]._doc[getLangParam], 'text'));
        result_data = await InterrestModel.findAll()
        output.add('interrest', _.sortBy(result_data[0]._doc[getLangParam], 'text'));
        break;
    }

    return output;
  }
}

const adminmember_service = new AdminMemberServiceClass()

export default adminmember_service
