import Page, { metadata } from '../page';
import PrivacyPolicy from '../PrivacyPolicy';

it('is an indexable page titled Privacy Policy', () => {
  expect(metadata.title).toBe('Privacy Policy');
  expect(metadata.robots).toBeUndefined();
});

it('renders the PrivacyPolicy component', () => {
  expect(Page().type).toBe(PrivacyPolicy);
});
