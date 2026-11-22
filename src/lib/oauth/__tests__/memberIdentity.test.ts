import { memberIdentity } from '../memberIdentity';

it('names the member by username, with their account email', () => {
  expect(memberIdentity({ username: 'Sweetman', email: 'member@example.com' }, 'privy@example.com'))
    .toEqual({ name: 'Sweetman', email: 'member@example.com', initial: 'S' });
});

it('falls back to the Privy email while the account loads, without repeating it', () => {
  expect(memberIdentity(null, 'member@example.com')).toEqual({ name: 'member@example.com', email: null, initial: 'M' });
});

it('says "You" when nothing is known yet', () => {
  expect(memberIdentity(null, undefined)).toEqual({ name: 'You', email: null, initial: 'Y' });
});
