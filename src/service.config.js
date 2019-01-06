// 이메일 발송 설정

export default {
  development: {
    "service_name": "SurgBook",
    "service_url": "http://127.0.0.1",
    "address_kor": "서울특별시 마포구 성암로 330 DMC첨단산업센터 516호 (주)엠티이지",
    "address_en": "330, Seongam-ro, Mapo-gu, Seoul, Republic of Korea",
    "main_domain": "www.mteg.co.kr",
    "main_telephone": "02.859.3585",
    "media_root": "C:\\surgbook",
    "crypto_key": "dev_dpaxldlwl",
    "trans_exe_path": "C:\\MTEG\\Util.AddTrans\\AddTrans.exe",
    "trans_ip_address": "127.0.0.1",
    "trans_port": "8090",
    "trans_root": "surgbook"
  },

  production: {
    "service_name": "SurgBook",
    "service_url": "https://www.surgbook.kr:444",
    "address_kor": "서울특별시 마포구 성암로 330 DMC첨단산업센터 516호 (주)엠티이지",
    "address_en": "330, Seongam-ro, Mapo-gu, Seoul, Republic of Korea",
    "main_domain": "www.mteg.co.kr",
    "main_telephone": "02.859.3585",
    "media_root": "\\\\192.168.0.51\\surgbook",
    "crypto_key": "service_dpaxldlwl",
    "trans_exe_path": "C:\\MTEG\\Util.AddTrans\\AddTrans.exe",
    "trans_ip_address": "127.0.0.1",
    "trans_port": "8090",
    "trans_root": "surgbook"
  },
};
