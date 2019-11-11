import {Router} from 'express';
import bodyParser from 'body-parser';
import {exec} from 'child_process';
import roles from "@/config/roles";
import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import MemberModel from '@/models/MemberModel';
import MemberAuthMailModel from '@/models/MemberAuthMailModel';
import Util from '@/utils/baseutil';

const routes = Router();

const sSiteCode = "BQ102";
const sSitePW = "KebrTmErp7KG";

const sModulePath = "D:\\00_Works\\02_Project\\00_Surgstory\\40_본인인증\\CertServiceModule\\Window\\CPClient.exe";

const sAuthType = "M";
const sPopGubun = "Y";
const sCustomize = "";
const sGender = "";

// const sReturnUrl = "https://www.surgstory.com/certresult";
// const sErrorUrl = "https://www.surgstory.com/certresult";
const sReturnUrl = "http://192.168.0.12/certresult.php";
const sErrorUrl = "http://192.168.0.12/certresult.php";

routes.get('/checkNice', Wrap(async(req, res) => {
  const sDate = new Date();
  let sCPRequest = sSiteCode + "_" + sDate.getTime();

  let sPlaincData = "";
  let sEncData = "";
  let sRtnMSG = "";

  sPlaincData = "7:REQ_SEQ" + sCPRequest.length + ":" + sCPRequest +
                "8:SITECODE" + sSiteCode.length + ":" + sSiteCode +
                "9:AUTH_TYPE" + sAuthType.length + ":" + sAuthType +
                "7:RTN_URL" + sReturnUrl.length + ":" + sReturnUrl +
                "7:ERR_URL" + sErrorUrl.length + ":" + sErrorUrl +
                "11:POPUP_GUBUN" + sPopGubun.length + ":" + sPopGubun +
                "9:CUSTOMIZE" + sCustomize.length + ":" + sCustomize +
                "6:GENDER" + sGender.length + ":" + sGender ;

  let cmd = sModulePath + " " + "ENC" + " " + sSiteCode + " " + sSitePW + " " + sPlaincData;

  const child = exec(cmd, {encoding: "euc-kr"});
  child.stdout.on("data", (data) => {
      sEncData += data;
  });

  child.on("close", () => {
    console.log(sEncData);
      
    if (sEncData == "-1") {
      sRtnMSG = "암/복호화 시스템 오류입니다.";
    } else if (sEncData == "-2") {
      sRtnMSG = "암호화 처리 오류입니다.";
    } else if (sEncData == "-3") {
      sRtnMSG = "암호화 데이터 오류 입니다.";
    } else if (sEncData == "-9") {
      sRtnMSG = "입력값 오류 : 암호화 처리시, 필요한 파라미터 값을 확인해 주시기 바랍니다.";
    } else {
      sRtnMSG = "";
    }

    const output = new StdObject();
    output.add('sEncData', sEncData);
    output.add('sRtnMSG', sRtnMSG);
    res.json(output);
  });
}));

routes.post('/certResult', Wrap(async(req, res) => {
  req.accepts('application/json');

  const encodeData = req.body.EncodeData;

  let sDecData = "";
  let cmd = "";
  
  if( /^0-9a-zA-Z+\/=/.test(encodeData) == true){
    sRtnMSG = "입력값 오류";
    requestnumber = "";
    authtype = "";
    errcode = "";

    const output = new StdObject();
    output.add('sRtnMSG', sRtnMSG);
    output.add('requestnumber', requestnumber);
    output.add('authtype', authtype);
    output.add('errcode', errcode);

    res.json(output);
  } else {
    if (encodeData !== "") {
      cmd = sModulePath + " " + "DEC" + " " + sSiteCode + " " + sSitePW + " " + encodeData;
    }
    
    const child = exec(cmd, {encoding: "euc-kr"});
    child.stdout.on("data", (data) => {
        sDecData += data;
    });

    child.on("close", () => {
      const output = new StdObject();
      let sRtnMSG = "";

      if (sDecData == "-1") {
        sRtnMSG = "암/복호화 시스템 오류";
      } else if (sDecData == "-4") {
        sRtnMSG = "복호화 처리 오류";
      } else if (sDecData == "-5") {
        sRtnMSG = "HASH값 불일치 - 복호화 데이터는 리턴됨";
      } else if (sDecData == "-6") {
        sRtnMSG = "복호화 데이터 오류";
      } else if (sDecData == "-9") {
        sRtnMSG = "입력값 오류";
      } else if (sDecData == "-12") {
        sRtnMSG = "사이트 비밀번호 오류";
      } else {
        output.add('resultData', {
          'requestnumber': decodeURIComponent(GetValue(sDecData , "REQ_SEQ")),
          'responsenumber': decodeURIComponent(GetValue(sDecData , "RES_SEQ")),
          'authtype': decodeURIComponent(GetValue(sDecData , "AUTH_TYPE")),
          'errcode': decodeURIComponent(GetValue(sDecData , "ERR_CODE")),
          'name': decodeURIComponent(GetValue(sDecData , "UTF8_NAME")),
          'birthdate': decodeURIComponent(GetValue(sDecData , "BIRTHDATE")),
          'gender': decodeURIComponent(GetValue(sDecData , "GENDER")),
          'nationalinfo': decodeURIComponent(GetValue(sDecData , "NATIONALINFO")),
          'dupinfo': decodeURIComponent(GetValue(sDecData , "DI")),
          'conninfo': decodeURIComponent(GetValue(sDecData , "CI")),
          'mobileno': decodeURIComponent(GetValue(sDecData , "MOBILE_NO")),
          'mobileco': decodeURIComponent(GetValue(sDecData , "MOBILE_CO")),
        });
      }
      console.log(output);
      res.json(output);
    });
  }
}));

function GetValue(plaindata , key){
  let arrData = plaindata.split(":");
  let value = "";
  for (let i in arrData) {
    var item = arrData[i];
    if (item.indexOf(key) == 0) {
      let valLen = parseInt(item.replace(key, ""));
      arrData[i++];
      value = arrData[i].substr(0 ,valLen);
      break;
    }
  }
  return value;
}

export default routes;
