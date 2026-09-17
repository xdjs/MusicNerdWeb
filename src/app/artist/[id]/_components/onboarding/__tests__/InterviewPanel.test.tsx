import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InterviewPanel from '../InterviewPanel';
import { answerInterviewQuestion, finishInterview, markInterviewOffered } from '@/app/actions/interviewActions';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/app/actions/interviewActions', () => ({
    answerInterviewQuestion: jest.fn(), finishInterview: jest.fn(), markInterviewOffered: jest.fn(),
}));
const save = jest.mocked(answerInterviewQuestion);
const questions = [
    { key: 'one', question: 'What inspired the record?', sourceUrl: 'https://www.instagram.com/p/example/' },
    { key: 'two', question: 'What came next?' },
];
function setup(items = questions) {
    const onClose = jest.fn();
    render(<InterviewPanel artistId="a1" artistName="Nova" draftScope="u1" questions={items} reason="new-material" onClose={onClose} />);
    return onClose;
}
function send() {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My own words.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}
beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    save.mockResolvedValue({ success: true });
    jest.mocked(markInterviewOffered).mockResolvedValue({ success: true });
    jest.mocked(finishInterview).mockResolvedValue({ success: true });
});
it('refreshes after one confirmed answer before closing early, retaining the source and batch', async () => {
    const close = setup();
    expect(screen.getByRole('link')).toHaveAttribute('href', questions[0]!.sourceUrl);
    send();
    await screen.findByText('What came next?');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ answer: 'My own words.', questionKey: 'one', questions }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});
it('keeps a pending save in the dialog and prevents repeated submission', async () => {
    let resolve!: (result: { success: boolean }) => void;
    save.mockImplementation(() => new Promise(r => { resolve = r; }));
    const close = setup();
    send();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(close).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    await act(async () => resolve({ success: true }));
    await screen.findByText('What came next?');
});
it.each(['returned', 'thrown'])('preserves an answer after a %s error and allows retry', async kind => {
    if (kind === 'returned') save.mockResolvedValueOnce({ success: false, error: 'Try again' });
    else save.mockRejectedValueOnce(new Error('Network disconnected'));
    setup();
    send();
    await screen.findByRole('alert');
    expect(screen.getByRole('textbox')).toHaveValue('My own words.');
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('What came next?');
    expect(refresh).toHaveBeenCalledTimes(1);
});
it('records skips without publishing an answer', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await screen.findByText('What came next?');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ answer: null, questions }));
    expect(refresh).not.toHaveBeenCalled();
});
it('refreshes saved answers even when the final document rebuild fails', async () => {
    jest.mocked(finishInterview).mockResolvedValue({ success: false });
    setup(questions.slice(0, 1));
    send();
    await screen.findByText('Thank you');
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByText(/page answers with it from here/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled());
});

it('saves only the current question, advances, and restores its draft when reviewed', async () => {
 const props={artistId:'a1',artistName:'Nova',questions,reason:'new-material' as const,draftScope:'u1',onClose:jest.fn(),onPause:jest.fn()};
 const view=render(<InterviewPanel {...props} />);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'An unfinished thought'}});
 fireEvent.click(screen.getByRole('button',{name:'Save for later'}));
 await screen.findByText('What came next?');
 expect(props.onPause).not.toHaveBeenCalled();
 expect(props.onClose).not.toHaveBeenCalled();
 expect(save).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Skip'}));
 await screen.findByRole('button',{name:'Review saved questions'});
 expect(jest.mocked(finishInterview)).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Review saved questions'}));
 expect(screen.getByRole('textbox')).toHaveValue('An unfinished thought');
 view.unmount();
});
it('keeps a failed pause open with its draft intact', async()=>{
 setup();
 jest.mocked(markInterviewOffered).mockResolvedValue({success:false});
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Keep this'}});
 fireEvent.click(screen.getByRole('button',{name:'Save for later'}));
 await screen.findByRole('alert');
 expect(screen.getByRole('textbox')).toHaveValue('Keep this');
 expect(save).not.toHaveBeenCalled();
});

it('isolates drafts between accounts and clears a sent question draft', async()=>{
 const props={artistId:'a1',artistName:'Nova',questions,reason:'first' as const,onClose:jest.fn()};
 const view=render(<InterviewPanel {...props} draftScope="u1"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Private thought'}});
 view.rerender(<InterviewPanel {...props} draftScope="u2"/>);
 expect(screen.getByRole('textbox')).toHaveValue('');
 view.rerender(<InterviewPanel {...props} draftScope="u1"/>);
 expect(screen.getByRole('textbox')).toHaveValue('Private thought');
 fireEvent.click(screen.getByRole('button',{name:'Send'}));
 await screen.findByText('What came next?');
 expect(localStorage.getItem('mn-interview-draft:'+JSON.stringify(['u1','a1','one']))).toBeNull();
});

it('keeps every individually saved question when leaving after the final question',async()=>{
 const onPause=jest.fn();const onClose=jest.fn();
 render(<InterviewPanel artistId="a1" artistName="Nova" questions={questions} reason="first" draftScope="u1" onClose={onClose} onPause={onPause}/>);
 fireEvent.click(screen.getByRole('button',{name:'Save for later'}));
 await screen.findByText('What came next?');
 fireEvent.click(screen.getByRole('button',{name:'Save for later'}));
 await screen.findByRole('button',{name:'Review saved questions'});
 expect(onClose).not.toHaveBeenCalled();expect(onPause).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Done'}));
 expect(onPause).toHaveBeenCalledWith(questions);
 expect(save).not.toHaveBeenCalled();
});

it('restores a draft when the only question is saved and reviewed immediately',async()=>{
 setup(questions.slice(0,1));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Keep this thought'}});
 fireEvent.click(screen.getByRole('button',{name:'Save for later'}));
 fireEvent.click(await screen.findByRole('button',{name:'Review saved questions'}));
 expect(screen.getByRole('textbox')).toHaveValue('Keep this thought');
});
