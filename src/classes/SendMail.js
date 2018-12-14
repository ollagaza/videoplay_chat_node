import nodemailer from 'nodemailer';
import _ from 'lodash';
import smtp_config from '@/smtp.config';
import StdObject from '@/classes/StdObject';

const env = process.env.NODE_ENV;
const IS_DEV = process.env.NODE_ENV === 'development';
const config = smtp_config[env];

export default class SendMail {
  test = async () => {
    const transport = this.getTransport();

    const mail_options = {
      from: config.sender,
      to: 'weather8128@gmail.com',
      subject: 'Nodemailer 테스트444',
      text: '평문 보내기 테스트 444'
    };

    return await this.send(transport, mail_options);
  }

  sendMailHtml = async (mail_to, subject, html) => {

    const transport = this.getTransport();

    const mail_options = {
      from: config.sender,
      to: _.join(mail_to, ', '),
      subject: subject,
      html: html
    };

    return await this.send(transport, mail_options);
  }

  getTransport = () => {
    return nodemailer.createTransport(config.transporter);
  }

  send = async (transport, mailOptions) => {
    const result = new StdObject();
    try {
      result.adds(await transport.sendMail(mailOptions));
    } catch (e) {
      result.setError(-1);
      result.setHttpStatusCode(500);
      if (IS_DEV) {
        result.stack = e.stack;
      }

      console.log(e);
    } finally {
      await transport.close();
    }

    return result;
  }
}
