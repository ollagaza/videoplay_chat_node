const table_message = `CREATE TABLE IF NOT EXISTS \`surgbook\`.\`message\` (
  \`seq\` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  \`send_seq\` INT(10) UNSIGNED NOT NULL,
  \`receive_seq\` INT(10) UNSIGNED NOT NULL,
  \`desc\` TEXT NULL DEFAULT 'null',
  \`is_view\` TINYINT(1) UNSIGNED NULL DEFAULT 0,
  \`is_send_del\` TINYINT(1) UNSIGNED NULL DEFAULT 0,
  \`is_receive_del\` TINYINT(1) UNSIGNED NULL DEFAULT 0,
  \`regist_date\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`seq\`),
  INDEX \`fk_message_group_info1_idx\` (\`send_seq\` ASC) VISIBLE,
  INDEX \`fk_message_group_info2_idx\` (\`receive_seq\` ASC) VISIBLE,
  CONSTRAINT \`fk_message_group_info1\`
    FOREIGN KEY (\`send_seq\`)
    REFERENCES \`surgbook\`.\`group_info\` (\`seq\`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT \`fk_message_group_info2\`
    FOREIGN KEY (\`receive_seq\`)
    REFERENCES \`surgbook\`.\`group_info\` (\`seq\`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB
;`;

const table_follower = `CREATE TABLE IF NOT EXISTS \`surgbook\`.\`follower\` (
  \`seq\` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  \`group_seq\` INT(10) UNSIGNED NOT NULL,
  \`follower_seq\` INT(10) UNSIGNED NOT NULL,
  INDEX \`fk_mentoring_group_info1_idx\` (\`group_seq\` ASC) VISIBLE,
  PRIMARY KEY (\`seq\`),
  INDEX \`fk_follower_group_info1_idx\` (\`follower_seq\` ASC) VISIBLE,
  CONSTRAINT \`fk_mentoring_group_info10\`
    FOREIGN KEY (\`group_seq\`)
    REFERENCES \`surgbook\`.\`group_info\` (\`seq\`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT \`fk_follower_group_info1\`
    FOREIGN KEY (\`follower_seq\`)
    REFERENCES \`surgbook\`.\`group_info\` (\`seq\`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
;`;

const table_following = `CREATE TABLE IF NOT EXISTS \`surgbook\`.\`following\` (
  \`seq\` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  \`group_seq\` INT(10) UNSIGNED NOT NULL,
  \`following_seq\` INT(10) UNSIGNED NOT NULL,
  PRIMARY KEY (\`seq\`),
  INDEX \`fk_following_group_info1_idx\` (\`group_seq\` ASC) VISIBLE,
  INDEX \`fk_following_group_info2_idx\` (\`following_seq\` ASC) VISIBLE,
  CONSTRAINT \`fk_following_group_info1\`
    FOREIGN KEY (\`group_seq\`)
    REFERENCES \`surgbook\`.\`group_info\` (\`seq\`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT \`fk_following_group_info2\`
    FOREIGN KEY (\`following_seq\`)
    REFERENCES \`surgbook\`.\`group_info\` (\`seq\`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
;`;

const alter_table_group_info = `ALTER TABLE \`surgbook\`.\`group_info\`
ADD COLUMN \`is_set_group_name\` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER \`modify_date\`,
ADD COLUMN \`profile\` JSON DEFAULT NULL AFTER \`is_set_group_name\`,
ADD COLUMN \`follower_count\` INT(10) UNSIGNED NOT NULL DEFAULT 0 AFTER \`profile\`,
ADD COLUMN \`following_count\` INT(10) UNSIGNED NOT NULL DEFAULT 0 AFTER \`follower_count\`,
ADD COLUMN \`is_channel\` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER \`following_count\`,
ADD COLUMN \`is_mentoring\` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER \`is_channel\`
;`;
