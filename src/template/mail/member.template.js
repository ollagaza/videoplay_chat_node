import formatter from "string-template";
import _ from 'lodash';
import service_config from '@/service.config';

const env = process.env.NODE_ENV;

const service_info = service_config[env];

const create_form = `
<div style="width: 100%;background: #fff;padding-top: 50px;">
	<div style="width: 430px;background: #fff;border-top: 10px solid #3061a5;border-bottom: 1px solid #3061a5;margin: auto;">
        <h1 style="width: 430px;text-align: center;border-bottom: 1px solid #999;color: #7fa2d3;margin: auto;padding: 20px 0;">{service_name} 인증메일</h1>
        <p style="width: 430px;font-size: 14px;color: #7fa2d3;margin: 30px 0;text-align: center;line-height: 24px;">{user_name} 선생님, 안녕하세요.<br><br>
서지북 계정을 등록해 주셔서 감사합니다. <br>
계정을 활성화하려면 확인버튼을 클릭하세요.<br>
확인 버튼을 클릭해도 아무 반응이 없으면 링크를 복사해 <br>
브라우저 주소 입력 창에 붙여 넣거나 직접 입력해 주세요.<br>{service_url}/v2/signup?auth_key={auth_key}&amp;member_seq={member_seq}</p>
        <div class="table_btn4" style="width: 430px;text-align: center;">
        	<a href="{service_url}/v2/signup/email?auth_key={auth_key}&member_seq={member_seq}" style="text-decoration: none;"><button type="submit" class="info_btn1" style="cursor: pointer;width: 200px;height: 43px;border-radius: 5px;background: #252a37;font-size: 18px;color: #fff;">확인</button></a>
        </div>
        <div class="copy" style="margin-top: 30px;background: #fff;text-align: center;padding-bottom: 20px;">
        	<img src="{service_url}/img/mail_sent.png" style="border: 0;">
        	<p>{address_kor}</p>
        	<p>{address_en}</p>
        	<img src="{service_url}/img/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_domain}</span> <img src="{service_url}/img/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_telephone}</span>
        </div>
     </div>
</div>
`;

const forgot_form = `
<div style="width: 100%; background: #fff;padding-top: 50px;">
  <div style="width: 600px; background: #fff;border-top: 10px solid #3061a5;border-bottom: 1px solid #3061a5;margin: auto;padding: 30px 30px;">
    <h1 style="width: 100%;text-align: center;border-bottom: 1px solid #999;color: #7fa2d3;margin: auto;padding-bottom: 20px;">{service_name} 계정정보 안내</h1>
    <p style="width: 100%; font-size: 14px;color: #7fa2d3; margin: 15px 0;text-align: center; line-height: 24px;">{user_name} 선생님, 안녕하세요.<br /><br />
      선생님께서는 계정정보 찾기를 요청하셨습니다.<br />
      아래 임시 비밀번호를 이용하여 로그인 후 <br />
      반드시 새로운 비밀번호로 변경하여 주시기 바랍니다. <br />
    </p>
    <div style="text-align:left; width: 80%; margin: 0 auto;">
  		<p style="margin:0 0 8px 0;padding:0;">계정정보</p>
  		<table style="width:100%;border-top:2px solid #444444;border-collapse:collapse;border-spacing:0;font-family:dotum,sans-serif;font-size:12px;color:#444">
  			<colgroup><col width="120px"><col></colgroup>
  			<tbody><tr>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0;background:#f9f9f9">아이디</td>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0"><strong>{email_address}</strong></td>
  			</tr>
  			<tr>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0;background:#f9f9f9">임시 비밀번호</td>
  				<td style="padding:13px 0 11px 19px;border:1px solid #c0c0c0"><strong>{tmp_password}</strong></td>
  			</tr>
  		</tbody></table>
  	</div>
    <div class="table_btn4" style="width: 100%; text-align: center; padding-top: 20px;">
    	<a href="{service_url}/" style="text-decoration: none;"><button class="info_btn1" style="cursor: pointer;width: 200px;height: 43px;border-radius: 5px;background: #252a37;font-size: 18px;color: #fff;">로그인 하러가기</button></a>
    </div>
    <div class="copy" style="margin-top: 30px;background: #fff;text-align: center;">
    	<img src="{service_url}/img/mail_sent.png" style="border: 0;">
    	<p>{address_kor}</p>
        	<p>{address_en}</p>
    	<img src="{service_url}/img/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_domain}</span> <img src="{service_url}/img/mail_dot.png" style="border: 0;"><span style="font-size: 12px;color: #999;">{main_telephone}</span>
    </div>
  </div>
</div>
`;

export default {
  "create": (template_data={}) => {
    console.log(service_info);
    return formatter(create_form, _.merge(template_data, service_info));
  },
  "forgot": (template_data={}) => {
    return formatter(forgot_form, _.merge(template_data, service_info));
  },
};
