const table_sendmail = `CREATE TABLE \`surgbook\`.\`sendmail\` (
  \`seq\` TINYINT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  \`email_title\` VARCHAR(255) NULL,
  \`email_desc\` TEXT NULL,
  \`email_list\` JSON NULL,
  \`member_seq\` INT(10) UNSIGNED NOT NULL,
  \`regist_date\` TIMESTAMP NULL DEFAULT current_timestamp,
  PRIMARY KEY (\`seq\`),
  CONSTRAINT \`fk_sendmail_member_seq\`
    FOREIGN KEY (\`member_seq\`)
    REFERENCES \`surgbook\`.\`member\` (\`seq\`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT);`
