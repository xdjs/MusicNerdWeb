import Page, { metadata } from '../page';
import TermsOfService from '../TermsOfService';

it('is an indexable page titled Terms of Service', () => {
  expect(metadata.title).toBe('Terms of Service');
  expect(metadata.robots).toBeUndefined();
});

it('renders the TermsOfService component', () => {
  expect(Page().type).toBe(TermsOfService);
});
