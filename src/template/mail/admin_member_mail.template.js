import formatter from 'string-template'
import _ from 'lodash'
import ServiceConfig from '../../service/service-config'

const mail_top = `
<table class="mteg_main_form" style="margin: 0; background-color: #f5f5f5; width: 100%; border-spacing: 0; padding: 0;">
	<tbody>
		<tr>
			<td style="padding: 30px 0 40px 0; width: 100%;" align="center">
				<table style="width: 700px; background-color: #fff; border: 1px solid #ddd; border-spacing: 0;">
					<tr>
						<td style="text-align: center; background-color: #009cdf; height: 150px; vertical-align: middle; padding: 0;">
							<img src="{service_domain}/img/renewal/mail_logo.png">
						</td>
					</tr>
					<tr>
						<td style="padding: 0;">
							<table style="width: 100%; padding: 50px; border-spacing: 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; font-size: 15px; font-weight: 400; color: #555;">
								<tr>
									<td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">
									안녕하세요.
									{user_name} 님 SurgStory 고객지원팀 입니다.
									</td>
								</tr>
`

const mail_bottom = `
								<tr>
									<td style="padding: 30px 0;">
										<div style="height: 1px; background-color: #ddd;"></div>
									</td>
								</tr>
								<tr>
									<td style="text-align: center; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">동영상기반의 수술/시술 관리 클라우드<br>어노테이션을 통한 효율적인 동영상 관리. AI 분석 동영상 리포트<br><a style="color: #009cdf;" href="{service_domain}" target="_blank">SurgStory.com</a></td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</tbody>
</table>
`
const mail_visit_button = `
								<tr>
									<td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 40px 0 0 0;">
										<a href="{service_domain}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">서지스토리 방문</a>
									</td>
								</tr>
`

const mail_recall_button = `
								<tr>
									<td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 40px 0 0 0;">
										<a href="{service_domain}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #ffa00f; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">재승인 요청</a>
									</td>
								</tr>
`

const joinconfrim_member_form = `
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 10px 0; line-height: 2;">
										{user_name}님 회원가입 승인이 완료 되었습니다.<br/>
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										감사합니다.
									</td>
								</tr>
`

const reject_member_form = `
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										{user_name}님 께서는 {regist_date}에 회원가입 신청을 해 주셨습니다.<br/>
										현재 아래의 사유로 가입 승인이 완료되지 않고 있사오니 <br/>
										조치하여 주시면 확인 후 승인진행 하여 드리겠습니다.<br/>
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-size: 18px; color: #009cdf; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 10px 0;">
										{admin_text}
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										감사합니다.
									</td>
								</tr>
`

const forced_leave_member_form = `
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										{user_name}님 께서는 {stop_start_date}부로 서지스토리 회원자격이 상실되었으며,<br/>
										사유는 아래와 같습니다.
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-size: 18px; color: #009cdf; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 10px 0;">
										{admin_text}
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										원활한 사이트 운영을 위한 조치이니 협조를 부탁드립니다.
										감사합니다.
									</td>
								</tr>
`

const leave_member_form = `
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										{user_name}님 께서는 {stop_start_date}부로 회원탈퇴를 하였습니다.
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										그 동안 저희 서지스토리를 이용해 주셔서 감사합니다.
									</td>
								</tr>
`

const dormant_member_form = `
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										{user_name}님께서 장기간 사용이 없어 휴면계정으로 전환됩니다.
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										감사합니다.
									</td>
								</tr>
`

const stop_member_form = `
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										{user_name}님은 {stop_start_date}부터 {stop_end_date}까지 서지스토리 회원 자격이 정지 되며,<br/>
										사유는 아래와 같습니다.
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-size: 18px; color: #009cdf; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 10px 0;">
										{admin_text}
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										원활한 사이트 이용을 위한 조치이니 협조를 부탁드립니다.
										감사합니다.
									</td>
								</tr>
`

const stopclear_member_form = `
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										{stop_start_date}부터 {stop_end_date}까지 시행되었던 서지스토리 회원 자격 정지가 해제되었습니다.<br/>
										사유는 아래와 같습니다.
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-size: 18px; color: #009cdf; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 10px 0;">
										{admin_text}
									</td>
								</tr>
								<tr>
									<td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
										앞으로 저희 서지스토리를 정상적으로 이용하실 수 있습니다.
										감사합니다.
									</td>
								</tr>
`

const getServiceInfo = () => {
  return ServiceConfig.getServiceInfo()
}

export default {
  'reject_member': (template_data = {}) => {
    const template_html = mail_top + reject_member_form + mail_recall_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'joinconfrim_member': (template_data = {}) => {
    const template_html = mail_top + joinconfrim_member_form + mail_visit_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'forced_leave_member': (template_data = {}) => {
    const template_html = mail_top + forced_leave_member_form + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'leave_member': (template_data = {}) => {
    const template_html = mail_top + leave_member_form + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'dormant_member': (template_data = {}) => {
    const template_html = mail_top + dormant_member_form + mail_visit_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'stop_member': (template_data = {}) => {
    const template_html = mail_top + stop_member_form + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
  'stopclear_member': (template_data = {}) => {
    const template_html = mail_top + stopclear_member_form + mail_visit_button + mail_bottom
    return formatter(template_html, _.merge(template_data, getServiceInfo()))
  },
}
