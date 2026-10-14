import { PgDialect } from 'drizzle-orm/pg-core';
import { queueDirectoryDiscovery } from '../queueDirectoryDiscovery';

it('keeps the creation event and fenced research job in one statement on the supplied transaction', async () => {
  const execute = jest.fn().mockResolvedValue([]);
  await queueDirectoryDiscovery({ execute }, 'artist-id', 'user-id');
  const { sql, params } = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
  expect(sql).toContain('with initiating_event');
  expect(sql).toContain("'directory_add', 'directory_add'");
  expect(sql).toContain("'claimId', null, 'purpose', 'directory_preparation'");
  expect(params).toEqual(['artist-id', 'user-id', 'artist-id']);
});

it('propagates queue failure so artist creation cannot commit without its research job', async () => {
  await expect(queueDirectoryDiscovery({ execute: jest.fn().mockRejectedValue(new Error('queue unavailable')) }, 'artist', 'user')).rejects.toThrow('queue unavailable');
});
