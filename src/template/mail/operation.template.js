import formatter from 'string-template'

const operation_link_email_form = `
<html>
<body>
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">안녕하세요, 수술저장소 SurgStory입니다.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;"><span style="color: #ffa00f;">"{user_name}"</span>님이 SurgStory의 <span style="color: #ffa00f;">"{operation_name}"</span>로 선생님을 초대하였습니다.</td>
                </tr>
                <tr>
                  <td style="padding: 30px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">
                    <div style="text-align: left; padding: 20px; background-color: #f5f5f5;">{message}</div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">SurgStory팀 드림</td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 30px 0 0 0;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">수술/시술 확인</a>
                  </td>
                </tr>
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
</body>
</html>
`

export default {
  'linkEmail': (template_data = {}) => {
    return formatter(operation_link_email_form, template_data)
  },
}
