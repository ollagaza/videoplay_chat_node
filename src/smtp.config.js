// 이메일 발송 설정

export default {
  development: {
    "transporter": {
      "host": "smtp.daum.net",
      "port": 465,
      "secure": true,
      "auth": {
        "user": "support.all",
        "pass": "mteg12345"
      }
    },
    "sender": "MTEG <support@mteg.co.kr>",
    "sender_mail": "support@mteg.co.kr",
    "sender_name": "MTEG"
  },

  production: {
    "transporter": {
      "host": "smtp.daum.net",
      "port": 465,
      "secure": true,
      "auth": {
        "user": "support.all",
        "pass": "mteg12345"
      }
    },
    "sender": "MTEG <support@mteg.co.kr>",
    "sender_mail": "support@mteg.co.kr",
    "sender_name": "MTEG"
  }
};
