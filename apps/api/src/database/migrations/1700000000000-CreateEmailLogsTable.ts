/**
 * Migration: Create Email Logs Table
 *
 * Creates the email_logs table for tracking all email sends
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmailLogsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'recipient_email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'recipient_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'email_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'subject',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'message_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'delivered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'opened_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'clicked_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'bounced_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'complained_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'bounce_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'complaint_reason',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_recipient_email',
        columnNames: ['recipient_email'],
      }),
    );

    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_message_id',
        columnNames: ['message_id'],
      }),
    );

    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_email_type',
        columnNames: ['email_type'],
      }),
    );

    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_user_created',
        columnNames: ['user_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'email_logs',
      new TableIndex({
        name: 'IDX_email_logs_type_created',
        columnNames: ['email_type', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_logs');
  }
}
