import formatter from 'string-template'

const invite_group_form = `
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{group_name}의 SurgStory에 참여하세요. <span style="color: #009cdf;">(현재 {active_count}명 활동)</span></td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;"><span style="color: #ffa00f;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f;">{admin_name}</span>님이 회원님을 초대하였습니다.<br>초대를 수락하여 수술동영상을 보관하고 팀원들과 공유해 보세요.</td>
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
                  <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #ddd;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; color: #888; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">초대코드</td>
                </tr>
                <tr>
                  <td style="text-align: center; font-size: 36px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{invite_code}</td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">초대 수락</a>
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

const invite_group_form_no_comment = `
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{group_name}의 SurgStory에 참여하세요. <span style="color: #009cdf;">(현재 {active_count}명 활동)</span></td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;"><span style="color: #ffa00f;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f;">{admin_name}</span>님이 회원님을 초대하였습니다.<br>초대를 수락하여 수술동영상을 보관하고 팀원들과 공유해 보세요.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 30px 0 0 0;">SurgStory팀 드림</td>
                </tr>
                <tr>
                  <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #ddd;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; color: #888; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">초대코드</td>
                </tr>
                <tr>
                  <td style="text-align: center; font-size: 36px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{invite_code}</td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">초대 수락</a>
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

const group_grade_admin_form = `
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;"><span style="color: #009cdf;">병원 관리자</span>가 되었습니다.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;"><span style="color: #ffa00f;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f;">{admin_name}</span>님이 회원님을 팀 관리자로 지정하였습니다.<br>팀 관리자는 팀원과 관련된 모든 부분을 관리할 수 있습니다.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 30px 0 0 0;">SurgStory팀 드림</td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 40px 0 0 0;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">관리 콘솔 바로가기</a>
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

const group_pause_form = `
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{group_name}의 의 SurgStory 사용이 <span style="color: #ffa00f;">일시 중단</span> 되었습니다.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">
                    <span style="color: #ffa00f;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f;">{admin_name}</span>님이 회원님의 팀 계정 접근을 일시 중단 하였습니다. 이제 팀 활동을 할 수 없으며, 계정에 있는 파일에 접근할 수 없습니다.<br/>
                    <span style="font-weight: 300;">("{group_name}"의 SurgStory 외에 다른 플랜은 접근이 가능합니다.)</span>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
                    궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>SurgStory팀 드림
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 40px 0 0 0;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">서지스토리 방문</a>
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

const group_un_pause_form = `
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{group_name}의 의 SurgStory 사용 <span style="color: #009cdf;">일시 중단</span>이 해제되었습니다.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">
                    <span style="color: #009cdf;">"{group_name}"</span>의 SurgStory 일시 중단이 해제되어 다시 접근이 가능합니다.<br/>이제 팀플랜에 접속하여 저장된 수술/시술, 알림메시지 등을 확인할 수 있습니다.
                  </td>
                </tr>
                <tr>
                  <td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
                    궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>SurgStory팀 드림
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 40px 0 0 0;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">서지스토리 방문</a>
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

const group_delete_form = `
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{group_name}의 의 SurgStory 팀원에서 <span style="color: #ffa00f;">일시 중단</span> 되었습니다.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">
                    <span style="color: #ffa00f;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #ffa00f;">{admin_name}</span>님이 회원님을 팀원에서 제외하였습니다. 더 이상 팀 활동을 할 수 없으며, 본인이 생성한 공유링크도 작동하지 않습니다.<br/>
                    <span style="font-weight: 300;">("{group_name}"의 SurgStory 외에 다른 플랜은 접근이 가능합니다.)</span>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
                    궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>SurgStory팀 드림
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 40px 0 0 0;">
                    <a href="{btn_link_url}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">서지스토리 방문</a>
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

const group_un_delete_form = `
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
                  <td style="text-align: left; font-weight: 500; font-size: 18px; color: #333; padding: 0 0 20px 0; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif;">{group_name}의 의 SurgStory 팀원으로 <span style="color: #009cdf;">복원</span> 되었습니다.</td>
                </tr>
                <tr>
                  <td style="text-align: left; font-size: 15px; line-height: 2; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 0;">
                    <span style="color: #009cdf;">"{group_name}"</span>의 SurgStory 관리자인 <span style="color: #009cdf;">{admin_name}</span>님이 회원님을 팀원으로 복원하였습니다. <br/>이제 다시 팀플랜에 접근하여 사용할 수 있습니다.
                  </td>
                </tr>
                <tr>
                  <td style="text-align: left; font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 20px 0 0 0; line-height: 2;">
                    궁금한 점은 "{group_name}"의 SurgStory 관리자인 {admin_name}님에게 문의해 주세요.<br>SurgStory팀 드림
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: Noto Sans KR, Arial, 맑은고딕, Malgun Gothic, sans-serif; padding: 40px 0 0 0;">
                    <a href="{service_domain}" style="text-decoration: none; width: 170px; height: 50px; font-size: 18px; background: #009cdf; border-radius: 4px; color: #fff; display: table-cell; vertical-align: middle;">서지스토리 방문</a>
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
  'inviteGroupMember': (template_data = {}, no_comment = false) => {
    if (no_comment) {
      return formatter(invite_group_form_no_comment, template_data)
    }
    return formatter(invite_group_form, template_data)
  },
  'groupAdmin': (template_data = {}) => {
    return formatter(group_grade_admin_form, template_data)
  },
  'pauseGroupMember': (template_data = {}) => {
    return formatter(group_pause_form, template_data)
  },
  'unPauseGroupMember': (template_data = {}) => {
    return formatter(group_un_pause_form, template_data)
  },
  'deleteGroupMember': (template_data = {}) => {
    return formatter(group_delete_form, template_data)
  },
  'unDeleteGroupMember': (template_data = {}) => {
    return formatter(group_un_delete_form, template_data)
  }
}
