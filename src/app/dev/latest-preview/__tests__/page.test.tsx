import LatestPreviewPage from '../page';
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({ notFound: jest.fn(() => { throw new Error('404'); }) }));
jest.mock('../LatestPreview', () => ({ __esModule: true, default: () => null }));

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; jest.clearAllMocks(); });

it.each(['production', undefined])('hides sample Latest data outside previews (%s)', environment => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    if (environment) process.env.VERCEL_ENV = environment;
    else delete process.env.VERCEL_ENV;
    expect(() => LatestPreviewPage()).toThrow('404');
    expect(notFound).toHaveBeenCalledTimes(1);
});

it.each([['production', 'preview'], ['development', undefined]])('allows review in %s/%s', (nodeEnv, environment) => {
    Object.assign(process.env, { NODE_ENV: nodeEnv });
    if (environment) process.env.VERCEL_ENV = environment;
    else delete process.env.VERCEL_ENV;
    expect(LatestPreviewPage()).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
});
