import nodemailer from 'nodemailer';
import smtp_config from '@/smtp.config';
import StdObject from '@/classes/StdObject';

const env = process.env.NODE_ENV;
const config = smtp_config[env];

export default class SendMail {
  test = async () => {
    const smtpTransport = nodemailer.createTransport(config.transporter);

    const mailOptions = {
      from: config.sender,
      to: 'weather8128@gmail.com',
      subject: 'Nodemailer 테스트444',
      text: '평문 보내기 테스트 444'
    };

    let result = new StdObject();
    try {
      result.adds(await smtpTransport.sendMail(mailOptions));
    } catch (e) {
      result.setError(-1);
      result.setHttpStatusCode(500);
      result.add('error', e);

      console.log(e);
    } finally {
      await smtpTransport.close();
    }

    return result;
  }
}
