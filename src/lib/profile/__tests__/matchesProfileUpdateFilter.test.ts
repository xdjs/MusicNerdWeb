import { matchesProfileUpdateFilter } from '../matchesProfileUpdateFilter';
it.each([
  ['All',['release','instagram','moment','interview']],
  ['Release',['release']],['Socials',['instagram','moment']],['Lore',['interview']],
  ['Instagram',['instagram']],['In-Process',['moment']],['Interview',['interview']],
  ['invalid',[]],['toString',[]],
])('%s includes only its intended card kinds', (filter,expected)=>{
  expect(['release','instagram','moment','interview'].filter(kind=>matchesProfileUpdateFilter(kind,filter))).toEqual(expected);
});
