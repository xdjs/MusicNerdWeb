import {render,screen,fireEvent} from '@testing-library/react';
import SourcePassageAnswer from '../SourcePassageAnswer';
const citation={sourceId:'1',url:'https://example.com/original',title:'Saved source'};
const source={type:'source-url',...citation};
const text='[Artist Doc] [1] & <img src=x onerror=alert(1)>\nA second line.';
const passage={type:'data-evidence-passage',id:'p',data:{text,citation,publishedAt:null,activityDate:null,retrievedAt:null}};
it('renders literal brackets, ampersand, HTML-like text and newlines with a separate real citation',()=>{
 const {container}=render(<SourcePassageAnswer parts={[source,passage,{type:'text',text:'Invented billing'}]} />);
 expect(screen.getByTestId('source-passage-text').textContent).toBe(text);
 expect(container.querySelector('img')).toBeNull();
 expect(screen.getAllByRole('link')).toHaveLength(1);
 expect(screen.getByRole('link')).toHaveAttribute('href',citation.url);
 expect(screen.queryByText('Invented billing')).not.toBeInTheDocument();
});
it('keeps the first passage visible while more arrive and preserves it on cancellation',()=>{
 const retry=jest.fn();const {rerender}=render(<SourcePassageAnswer parts={[source,passage]} busy onRetry={retry} />);
 expect(screen.getByTestId('source-passage-text').textContent).toBe(text);
 expect(screen.getByRole('status')).toHaveTextContent('Checking');
 rerender(<SourcePassageAnswer parts={[source,passage]} stopped onRetry={retry} />);
 expect(screen.getByRole('status')).toHaveTextContent('Stopped');
 expect(retry).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Try again'}));expect(retry).toHaveBeenCalledTimes(1);
});
it('shows honest fixed failure, never unvalidated mixed prose',()=>{
 render(<SourcePassageAnswer parts={[{type:'data-evidence-status',data:{code:'validation_failed'}},{type:'text',text:'No evidence exists.'}]} />);
 expect(screen.getByRole('status')).toHaveTextContent("couldn't validate");expect(screen.queryByText('No evidence exists.')).not.toBeInTheDocument();
});
