import { fireEvent, render, screen } from '@testing-library/react';
import MusicNerdSelect from '../MusicNerdSelect';

it('keeps semantic values in GET forms, including an empty All filter', () => {
  const {container} = render(<form><MusicNerdSelect label="Platform" name="platform" defaultValue="website" options={[{value:'',label:'All platforms'},{value:'website',label:'Website'}]} /></form>);
  expect(new FormData(container.querySelector('form')!).get('platform')).toBe('website');
  fireEvent.keyDown(screen.getByRole('combobox',{name:'Platform'}),{key:'ArrowDown'});
  fireEvent.click(screen.getByRole('option',{name:'All platforms'}));
  expect(new FormData(container.querySelector('form')!).get('platform')).toBe('');
  expect(screen.getByRole('combobox',{name:'Platform'})).toHaveTextContent('All platforms');
});

it('disables the control and excludes its value from form submission', () => {
  const {container} = render(<form><MusicNerdSelect label="Status" name="status" disabled defaultValue="pending" options={[{value:'pending',label:'Pending'}]} /></form>);
  expect(screen.getByRole('combobox',{name:'Status'})).toBeDisabled();
  expect(new FormData(container.querySelector('form')!).has('status')).toBe(false);
});
