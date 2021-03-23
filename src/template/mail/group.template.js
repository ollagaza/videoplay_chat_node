import formatter from 'string-template'

const group_mail_common_top = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" height="100%" style="background-color: #f5f5f5">
    <tbody>
        <tr>
            <td style="padding: 30px 0 40px 0; width: 100%;" align="center">
                <table style="width: 700px; background-color: #fff; border: 1px solid #ddd; border-spacing: 0;">
                <tbody>
                    <tr>
                        <td style="width: 100%; height: 150px; background-color: #1c3048; text-align: center;">
                            <a href="{service_domain}" target="_blank"><img src="{service_domain}/img/mail_logo.png"></a>
                        </td>
                    </tr>
                    <tr>
                      <td style="width: 100%; padding: 40px;">
                        <table style="width: 100%; border-spacing: 0;">
                        <tbody>
`
const group_mail_common_bottom = `
                          <tr>
                                <td style="border-bottom: 1px solid #ddd; padding-top: 30px;"></td>
                          </tr>
                          <tr>
                              <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; text-align: center; padding-top: 30px;">
                                  지능형 의료영상 관리 솔루션<br>
                                  <a href="{service_domain}" target="_blank" style="text-decoration:none; color:#fff;"><span style="font-size: 18px; color: #2e6bb8; font-weight: bold;">Surgstory.co.kr</span></a>
                              </td>
                          </tr>
                        </tbody>
                        </table>
                      </td>
                    </tr>
                </tbody>
                </table>
            </td>
        </tr>
    </tbody>
    </table>
`
const invite_group_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
        {group_name}의 SurgStory에 참여하세요. <span style="font-size: 14px; color: #2e6bb8;">현재 {active_count}명 활동</span>
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 초대하였습니다.<br>
      초대를 수락하여 수술동영상을 보관하고 팀원들과 공유해 보세요.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.6; padding: 20px; background-color: #f5f5f5;">
      {message}
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-top: 16px;">
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
      <td style="border-bottom: 1px solid #ddd; padding-top: 30px;"></td>
  </tr>
  <tr>
    <td align="center" style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; padding-top: 30px;">
      초대코드<br>
      <span style="font-size: 32px; color: #ffa00f; font-weight: bold;">{invite_code}</span>
    </td>
  </tr>

  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">초대 수락</a>
    </td>
  </tr>
`
const invite_group_form_no_comment = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
        {group_name}의 SurgStory에 참여하세요. <span style="font-size: 14px; color: #2e6bb8;">현재 {active_count}명 활동</span>
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 초대하였습니다.<br>
      초대를 수락하여 수술동영상을 보관하고 팀원들과 공유해 보세요.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-top: 16px;">
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
      <td style="border-bottom: 1px solid #ddd; padding-top: 30px;"></td>
  </tr>
  <tr>
    <td align="center" style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.4; padding-top: 30px;">
      초대코드<br>
      <span style="font-size: 32px; color: #ffa00f; font-weight: bold;">{invite_code}</span>
    </td>
  </tr>

  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">초대 수락</a>
    </td>
  </tr>
`
const group_grade_admin_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #2e6bb8;">병원 관리자</span>가 되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 채널 관리자로 지정하였습니다.<br>
      채널 관리자는 팀원과 관련된 모든 부분을 관리할 수 있습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="" target="_blank" style="text-decoration: none; width: 180px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">관리 콘솔 바로가기</a>
    </td>
  </tr>
`
const group_pause_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f;">"{group_name}"</span>채널의 SurgStory 사용이 <span style="color: #2e6bb8;">일시 중단</span> 되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님의 채널 계정 접근을
      <span style="color: #2e6bb8; font-weight: bold;">일시 중단</span> 하였습니다.<br>
      이제 채널 활동을 할 수 없으며, 채널에 있는 파일에 접근할 수 없습니다.<br>
      ("{group_name}"의 SurgStory 외에 다른 채널은 접근이 가능합니다.)
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">서지스토리</a>
    </td>
  </tr>
`
const group_un_pause_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f;">"{group_name}"</span>채널의 SurgStory 일시 중단이 <span style="color: #2e6bb8;">해제</span>되어 다시 접근이 가능합니다
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">서지스토리</a>
    </td>
  </tr>
`
const group_delete_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f;">"{group_name}"</span>의 SurgStory 팀원에서 제외되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>채널의 SurgStory 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 팀원에서 제외하였습니다.<br>
      이제 채널 활동을 할 수 없으며, 계정에 있는 파일에 접근할 수 없습니다.<br>
      ("{group_name}"의 SurgStory 외에 다른 채널은 접근이 가능합니다.)
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">서지스토리</a>
    </td>
  </tr>
`
const group_un_delete_form = `
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #333; letter-spacing:-0.5px;line-height: 1.4;padding-bottom: 14px;">
      <span style="color: #ffa00f;">"{group_name}"</span>의 SurgStory 팀원으로 <span style="color: #2e6bb8;">복원</span>되었습니다.
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7; padding-bottom: 16px;">
      <span style="color: #ffa00f; font-weight: bold;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f; font-weight: bold;">{admin_name}</span>님이 회원님을 팀원에서 복원하였습니다.<br>
      이제 다시 채널에 접근하여 사용할 수 있습니다.<br>
    </td>
  </tr>
  <tr>
    <td style="font-family: 맑은고딕, Malgun Gothic, 돋움, dotum, Arial, sans-serif; font-size: 14px; color: #555; letter-spacing:-0.5px; line-height: 1.7;">
      궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>
      SurgStory팀 드림
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top: 30px;">
      <a href="" target="_blank" style="text-decoration: none; width: 140px; height: 40px; font-size: 14px; background: #2e6bb8; border-radius: 20px; color: #fff; display: table-cell; vertical-align: middle;" rel="noopener noreferrer">서지스토리</a>
    </td>
  </tr>
`


export default {
  'inviteGroupMember': (template_data = {}, no_comment = false) => {
    if (no_comment) {
      const template_html = group_mail_common_top + invite_group_form_no_comment + group_mail_common_bottom
      return formatter(template_html, template_data)
    }
    const template_html = group_mail_common_top + invite_group_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'groupAdmin': (template_data = {}) => {
    const template_html = group_mail_common_top + group_grade_admin_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'pauseGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_pause_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'unPauseGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_un_pause_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'deleteGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_delete_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  },
  'unDeleteGroupMember': (template_data = {}) => {
    const template_html = group_mail_common_top + group_un_delete_form + group_mail_common_bottom
    return formatter(template_html, template_data)
  }
}
