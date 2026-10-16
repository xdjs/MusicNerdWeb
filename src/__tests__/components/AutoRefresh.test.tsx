import { render } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import AutoRefresh from '@/app/_components/AutoRefresh';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));

describe('artist session refresh', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does not start a refresh loop when an existing session resolves after mounting', () => {
        (useSession as jest.Mock).mockReturnValue({ status: 'loading' });
        const { rerender, container } = render(<AutoRefresh showLoading={false} />);
        expect(container).toBeEmptyDOMElement();
        (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
        rerender(<AutoRefresh showLoading={false} />);
        rerender(<AutoRefresh showLoading={false} />);
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('refreshes exactly once after an anonymous visitor signs in', () => {
        (useSession as jest.Mock).mockReturnValue({ status: 'unauthenticated' });
        const { rerender } = render(<AutoRefresh showLoading={false} />);
        (useSession as jest.Mock).mockReturnValue({ status: 'loading' });
        rerender(<AutoRefresh showLoading={false} />);
        (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
        rerender(<AutoRefresh showLoading={false} />);
        rerender(<AutoRefresh showLoading={false} />);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
});
